"""Authorized-voice TTS worker using F5-TTS.

This worker is intentionally local-first. It accepts a short reference recording plus
its transcript, keeps the model loaded, and returns WAV audio for authorized voices.

The public F5-TTS checkpoints have their own non-commercial license; replace the
checkpoint with a properly licensed model for commercial use.
"""
import io, os, uuid, asyncio
from pathlib import Path
from typing import Dict
import soundfile as sf
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

ROOT = Path(os.getenv("LIVESIM_VOICE_DATA", Path.home() / ".livesim-voices"))
ROOT.mkdir(parents=True, exist_ok=True)
DEVICE = os.getenv("LIVE_VOICE_DEVICE", "cuda")
MODEL = os.getenv("LIVE_VOICE_MODEL", "F5TTS_v1_Base")
app = FastAPI(title="LiveSim Lab Authorized Voice Worker")
origins = [x.strip() for x in os.getenv("LIVESIM_VOICE_CORS", "*").split(",") if x.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=False,
                   allow_methods=["*"], allow_headers=["*"])

profiles: Dict[str, dict] = {}
tts = None
tts_error = None
lock = asyncio.Lock()

def load_tts():
    global tts, tts_error
    if tts is not None:
        return tts
    try:
        from f5_tts.api import F5TTS
        import torch
        device = DEVICE if DEVICE != "cuda" or torch.cuda.is_available() else "cpu"
        tts = F5TTS(model=MODEL, device=device)
        tts_error = None
        return tts
    except Exception as exc:
        tts_error = str(exc)
        raise

@app.get("/health")
def health():
    return {"ok": True, "service": "livesim-authorized-voice", "loaded": tts is not None,
            "model": MODEL, "device": DEVICE, "error": tts_error}

@app.get("/capabilities")
def capabilities():
    return {"voiceClone": True, "tts": True, "referenceAudio": "wav/mp3",
            "authorizationRequired": True, "model": MODEL}

@app.post("/profiles")
async def create_profile(audio: UploadFile = File(...), transcript: str = Form(...),
                         authorized: str = Form(...)):
    if authorized.lower() not in ("true", "1", "yes"):
        raise HTTPException(400, "Authorization confirmation is required.")
    if not transcript.strip():
        raise HTTPException(400, "Reference transcript is required.")
    if not audio.content_type or not audio.content_type.startswith("audio/"):
        raise HTTPException(400, "Reference must be an audio file.")
    data = await audio.read()
    if len(data) > 15 * 1024 * 1024:
        raise HTTPException(413, "Reference audio is too large.")
    pid = "voice_" + uuid.uuid4().hex[:12]
    suffix = Path(audio.filename or "reference.wav").suffix.lower() or ".wav"
    path = ROOT / f"{pid}{suffix}"
    path.write_bytes(data)
    profiles[pid] = {"id": pid, "path": str(path), "transcript": transcript.strip(), "authorized": True}
    return {"id": pid, "status": "ready", "model": MODEL}

@app.post("/synthesize")
async def synthesize(payload: dict):
    pid = str(payload.get("profileId") or "")
    text = str(payload.get("text") or "").strip()
    if not pid or pid not in profiles:
        raise HTTPException(404, "Voice profile not found.")
    if not text:
        raise HTTPException(400, "Text is required.")
    if len(text) > 2000:
        raise HTTPException(413, "Text is limited to 2000 characters per request.")
    try:
        engine = load_tts()
    except Exception as exc:
        raise HTTPException(503, f"Voice model could not load: {exc}")
    async with lock:
        try:
            wav, sr, _ = await asyncio.to_thread(
                engine.infer,
                ref_file=profiles[pid]["path"],
                ref_text=profiles[pid]["transcript"],
                gen_text=text,
                nfe_step=int(payload.get("steps") or 16),
                speed=float(payload.get("speed") or 1.0),
            )
        except Exception as exc:
            raise HTTPException(500, f"Synthesis failed: {exc}")
    buf = io.BytesIO()
    sf.write(buf, wav, sr, format="WAV", subtype="PCM_16")
    buf.seek(0)
    return StreamingResponse(buf, media_type="audio/wav",
                             headers={"X-LiveSim-Voice-Profile": pid})

@app.delete("/profiles/{pid}")
def delete_profile(pid: str):
    profile = profiles.pop(pid, None)
    if not profile:
        raise HTTPException(404, "Voice profile not found.")
    try: Path(profile["path"]).unlink(missing_ok=True)
    except Exception: pass
    return {"ok": True}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=os.getenv("LIVESIM_VOICE_HOST", "127.0.0.1"),
                port=int(os.getenv("LIVESIM_VOICE_PORT", "8790")))
