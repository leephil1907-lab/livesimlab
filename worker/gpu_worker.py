"""
Reachmark FaceHub — GPU live engine.

Real-time face transformation worker (InsightFace detection + inswapper, the
same core used by Deep-Live-Cam). The web app connects to it server-to-server;
browsers never talk to this worker directly.

  POST   /sessions                 → create a session            {"mouthMask": true}
  POST   /sessions/{id}/source     → upload/replace the character portrait (multipart "source")
  WS     /sessions/{id}/stream     → binary JPEG in  → binary JPEG out
                                     text {"type":"settings","mouthMask":bool}
  DELETE /sessions/{id}
  GET    /health                   → {"ok", "modelLoaded", "provider", ...}

All endpoints require `Authorization: Bearer $WORKER_TOKEN` when WORKER_TOKEN is set.
"""
from __future__ import annotations

import asyncio
import hmac
import json
import logging
import math
import os
import threading
import time
import uuid
from contextlib import asynccontextmanager
from pathlib import Path

import cv2
import numpy as np
from fastapi import Depends, FastAPI, File, Header, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

log = logging.getLogger("facehub.worker")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

HERE = Path(__file__).resolve().parent
MODELS_DIR = Path(os.getenv("MODELS_DIR", HERE / "models"))
WORKER_TOKEN = os.getenv("WORKER_TOKEN", "")
PROVIDER = os.getenv("PROVIDER", "auto").lower()          # auto | cuda | tensorrt | directml | coreml | cpu
DET_SIZE = int(os.getenv("DET_SIZE", "640"))               # 320 is faster, 640 more robust
JPEG_QUALITY = int(os.getenv("JPEG_QUALITY", "85"))
MAX_SESSIONS = int(os.getenv("MAX_SESSIONS", "4"))
SESSION_IDLE_SECONDS = int(os.getenv("SESSION_IDLE_SECONDS", "120"))
LOW_MEMORY = os.getenv("LOW_MEMORY", "auto").lower()       # auto = on when running on CPU only


# ───────────────────────── model ─────────────────────────

def pick_providers() -> list[str]:
    import onnxruntime as ort
    available = ort.get_available_providers()
    wanted = {
        "tensorrt": ["TensorrtExecutionProvider", "CUDAExecutionProvider"],
        "cuda": ["CUDAExecutionProvider"],
        "directml": ["DmlExecutionProvider"],
        "coreml": ["CoreMLExecutionProvider"],
        "cpu": [],
    }.get(PROVIDER)
    if wanted is None:  # auto
        wanted = [p for p in ("CUDAExecutionProvider", "DmlExecutionProvider", "CoreMLExecutionProvider") if p in available][:1]
    chosen = [p for p in wanted if p in available] + ["CPUExecutionProvider"]
    if wanted and not any(p in available for p in wanted):
        log.warning("Requested provider %s not available (have %s); falling back to CPU", PROVIDER, available)
    return chosen


class Engine:
    def __init__(self) -> None:
        self.ready = False
        self.error: str | None = None
        self.providers: list[str] = []
        self.analyser = None
        self.swapper = None
        self.lock = threading.Lock()  # ONNX sessions are thread-safe, but keep GPU work serialized per process

    def load(self) -> None:
        try:
            import insightface
            from insightface.app import FaceAnalysis

            self.providers = pick_providers()
            log.info("Loading models with providers %s", self.providers)
            swapper_path = next((MODELS_DIR / n for n in ("inswapper_128_fp16.onnx", "inswapper_128.onnx") if (MODELS_DIR / n).exists()), None)
            if swapper_path is None:
                raise RuntimeError(f"Face model missing. Run: python worker/download_models.py  (expected in {MODELS_DIR})")
            analyser = FaceAnalysis(name="buffalo_l", root=str(MODELS_DIR), providers=self.providers, allowed_modules=["detection", "recognition"])
            analyser.prepare(ctx_id=0, det_size=(DET_SIZE, DET_SIZE))
            self.analyser = analyser
            extra = {}
            if LOW_MEMORY in ("1", "true", "yes") or (LOW_MEMORY == "auto" and self.providers == ["CPUExecutionProvider"]):
                import onnxruntime as ort
                so = ort.SessionOptions()
                so.enable_cpu_mem_arena = False
                so.enable_mem_pattern = False
                so.graph_optimization_level = ort.GraphOptimizationLevel.ORT_DISABLE_ALL
                extra["sess_options"] = so
                log.info("Low-memory mode on")
            self.swapper = insightface.model_zoo.get_model(str(swapper_path), providers=self.providers, **extra)
            # Warm up so the first live frame isn't slow.
            dummy = np.zeros((480, 640, 3), dtype=np.uint8)
            self.analyser.det_model.detect(dummy, max_num=1, metric="default")
            self.ready = True
            log.info("Engine ready (%s)", swapper_path.name)
        except Exception as exc:  # noqa: BLE001
            self.error = str(exc)
            log.exception("Engine failed to load")

    def source_face(self, image: np.ndarray):
        faces = self.analyser.get(image)
        if not faces:
            raise ValueError("No face found in this portrait. Use a clear, front-facing photo.")
        return max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))

    def render(self, frame: np.ndarray, source, mouth_mask: bool) -> np.ndarray:
        from insightface.app.common import Face
        with self.lock:
            bboxes, kpss = self.analyser.det_model.detect(frame, max_num=1, metric="default")
            if bboxes is None or bboxes.shape[0] == 0 or kpss is None:
                return frame
            target = Face(bbox=bboxes[0, :4], kps=kpss[0], det_score=bboxes[0, 4])
            out = self.swapper.get(frame, target, source, paste_back=True)
        if mouth_mask:
            out = restore_mouth(frame, out, kpss[0])
        return out


def restore_mouth(original: np.ndarray, swapped: np.ndarray, kps: np.ndarray) -> np.ndarray:
    """Blend the performer's real mouth back in (feathered ellipse between mouth corners)."""
    left, right = kps[3], kps[4]
    width = float(np.linalg.norm(right - left))
    if width < 8:
        return swapped
    cx, cy = (left + right) / 2
    angle = math.degrees(math.atan2(right[1] - left[1], right[0] - left[0]))
    ax, ay = int(width * 0.78), int(width * 0.5)
    pad = int(width * 1.2)
    h, w = original.shape[:2]
    x0, y0 = max(0, int(cx - pad)), max(0, int(cy - pad))
    x1, y1 = min(w, int(cx + pad)), min(h, int(cy + pad))
    if x1 <= x0 or y1 <= y0:
        return swapped
    mask = np.zeros((y1 - y0, x1 - x0), dtype=np.float32)
    cv2.ellipse(mask, (int(cx - x0), int(cy - y0 + width * 0.08)), (ax, ay), angle, 0, 360, 1.0, -1)
    k = max(3, int(width * 0.35) | 1)
    mask = cv2.GaussianBlur(mask, (k, k), 0)[..., None]
    out = swapped.copy()
    roi = (slice(y0, y1), slice(x0, x1))
    out[roi] = (swapped[roi] * (1 - mask) + original[roi] * mask).astype(np.uint8)
    return out


engine = Engine()
threading.Thread(target=engine.load, daemon=True).start()


@asynccontextmanager
async def lifespan(_app):
    async def reap():
        while True:
            await asyncio.sleep(30)
            cutoff = time.time() - SESSION_IDLE_SECONDS
            for sid in [k for k, v in sessions.items() if v.last_seen < cutoff]:
                sessions.pop(sid, None)
    task = asyncio.create_task(reap())
    yield
    task.cancel()


app = FastAPI(title="FaceHub GPU worker", docs_url=None, redoc_url=None, lifespan=lifespan)


# ───────────────────────── sessions ─────────────────────────

class Session:
    def __init__(self, mouth_mask: bool) -> None:
        self.id = "gpu_" + uuid.uuid4().hex[:16]
        self.mouth_mask = mouth_mask
        self.source = None
        self.frames = 0
        self.last_seen = time.time()
        self.fps = 0.0


sessions: dict[str, Session] = {}


def check_token(token: str | None) -> None:
    if not WORKER_TOKEN:
        return
    supplied = (token or "").removeprefix("Bearer ").strip()
    if not hmac.compare_digest(supplied, WORKER_TOKEN):
        raise HTTPException(401, "Invalid worker token")


def auth(authorization: str | None = Header(default=None)) -> None:
    check_token(authorization)


def get_session(sid: str) -> Session:
    s = sessions.get(sid)
    if not s:
        raise HTTPException(404, "Session not found")
    s.last_seen = time.time()
    return s


def decode(payload: bytes):
    return cv2.imdecode(np.frombuffer(payload, dtype=np.uint8), cv2.IMREAD_COLOR)


def encode(frame: np.ndarray) -> bytes:
    ok, buf = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), JPEG_QUALITY])
    if not ok:
        raise RuntimeError("JPEG encode failed")
    return buf.tobytes()


class CreateSession(BaseModel):
    mouthMask: bool = True


@app.get("/health")
def health(_: None = Depends(auth)):
    return {
        "ok": True,
        "modelLoaded": engine.ready,
        "loading": not engine.ready and engine.error is None,
        "error": engine.error,
        "provider": (engine.providers or ["?"])[0].replace("ExecutionProvider", "").lower(),
        "sessions": len(sessions),
        "maxSessions": MAX_SESSIONS,
    }


@app.post("/sessions")
def create_session(body: CreateSession | None = None, _: None = Depends(auth)):
    if not engine.ready:
        raise HTTPException(503, engine.error or "Engine is still loading")
    if len(sessions) >= MAX_SESSIONS:
        raise HTTPException(503, "The live engine is at capacity. Please try again shortly.")
    s = Session(body.mouthMask if body else True)
    sessions[s.id] = s
    return {"sessionId": s.id}


@app.post("/sessions/{sid}/source")
async def set_source(sid: str, source: UploadFile = File(...), _: None = Depends(auth)):
    s = get_session(sid)
    image = decode(await source.read())
    if image is None:
        raise HTTPException(400, "Invalid image")
    try:
        s.source = await asyncio.to_thread(engine.source_face, image)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    return {"ok": True}


@app.delete("/sessions/{sid}")
def delete_session(sid: str, _: None = Depends(auth)):
    sessions.pop(sid, None)
    return {"ok": True}


@app.websocket("/sessions/{sid}/stream")
async def stream(ws: WebSocket, sid: str):
    try:
        check_token(ws.headers.get("authorization"))
    except HTTPException:
        await ws.close(code=4401)
        return
    s = sessions.get(sid)
    await ws.accept()
    if not s or s.source is None:
        await ws.send_text(json.dumps({"type": "error", "message": "Session not ready"}))
        await ws.close(code=4404)
        return

    latest: dict[str, bytes | None] = {"frame": None}
    has_frame = asyncio.Event()
    closed = asyncio.Event()

    async def receiver():
        try:
            while True:
                msg = await ws.receive()
                if msg["type"] == "websocket.disconnect":
                    break
                if msg.get("bytes"):
                    latest["frame"] = msg["bytes"]  # keep only the newest frame → low latency
                    has_frame.set()
                elif msg.get("text"):
                    data = json.loads(msg["text"])
                    if data.get("type") == "settings":
                        s.mouth_mask = bool(data.get("mouthMask", s.mouth_mask))
        except (WebSocketDisconnect, RuntimeError):
            pass
        finally:
            closed.set()
            has_frame.set()

    async def processor():
        while not closed.is_set():
            await has_frame.wait()
            has_frame.clear()
            payload, latest["frame"] = latest["frame"], None
            if payload is None or closed.is_set():
                continue
            frame = decode(payload)
            if frame is None:
                continue
            started = time.perf_counter()
            try:
                out = await asyncio.to_thread(engine.render, frame, s.source, s.mouth_mask)
                await ws.send_bytes(encode(out))
            except Exception as exc:  # noqa: BLE001
                log.warning("render failed: %s", exc)
                break
            s.frames += 1
            s.last_seen = time.time()
            s.fps = round(0.9 * s.fps + 0.1 / max(1e-3, time.perf_counter() - started), 1)

    await asyncio.gather(receiver(), processor())
    try:
        await ws.close()
    except RuntimeError:
        pass


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=os.getenv("HOST", "0.0.0.0"), port=int(os.getenv("PORT", "8787")))
