# FaceHub GPU worker

The real-time face engine. It runs on a machine with an NVIDIA GPU (your own PC, a cloud GPU such as RunPod, Vast.ai, Lambda or AWS g5, or the same server via `docker compose --profile gpu`).

How it works: it uses InsightFace detection and recognition to find the character's identity, then `inswapper_128` maps that identity onto each camera frame. This is the same core Deep-Live-Cam uses. Only the newest frame is processed, so latency stays low even when the network is jittery.

## Install

```bash
cd worker
python -m venv .venv && source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install cython
pip install -r requirements.txt
python download_models.py                              # ~600 MB into worker/models
```

- **NVIDIA**: needs a recent driver, CUDA 12 and cuDNN 9 (bundled in the Docker image).
- **Windows + AMD/Intel GPU**: `pip uninstall onnxruntime-gpu && pip install onnxruntime-directml`, then set `PROVIDER=directml`.
- **CPU only**: `pip install onnxruntime`. It works (about 2–3 s per frame) and is handy for testing, but it is not live.
- **Windows build error for insightface?** Install the "Desktop development with C++" workload from Visual Studio Build Tools, then retry.

## Run

```bash
WORKER_TOKEN=change-me python gpu_worker.py            # http://0.0.0.0:8787
```

Then in the web app's `.env`:

```
GPU_WORKER_URL=http://<worker-host>:8787
GPU_WORKER_TOKEN=change-me
TEST_ENGINE=false
```

Check it with `curl -H "Authorization: Bearer change-me" http://<worker-host>:8787/health`. It should return `"modelLoaded": true`.

## Docker

```bash
docker build -t facehub-worker .
docker run --gpus all -p 8787:8787 -e WORKER_TOKEN=change-me facehub-worker
```

## Settings (environment variables)

| Variable | Default | Meaning |
|---|---|---|
| `WORKER_TOKEN` | *(empty)* | Shared secret. **Always set this** when the worker is reachable from the internet. |
| `PROVIDER` | `auto` | `cuda`, `tensorrt`, `directml`, `coreml`, `cpu` |
| `DET_SIZE` | `640` | Face detector input size. `320` is faster, `640` handles small or far faces better. |
| `JPEG_QUALITY` | `85` | Output frame quality |
| `MAX_SESSIONS` | `4` | Concurrent live takes per worker |
| `LOW_MEMORY` | `auto` | Lean ONNX settings (on automatically for CPU) |
| `MODELS_DIR` | `worker/models` | Where the models live |

## Security

- Expose the worker only to your web server: use a firewall rule, a private network or HTTPS with a token.
- The worker keeps nothing on disk. Portraits and frames are held in memory only for the session.

## Model licence

The public `inswapper_128` weights are released for non-commercial research use. Get a commercial licence from InsightFace (or use a commercially licensed model) before charging customers.
