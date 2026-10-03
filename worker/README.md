# LiveSim Lab GPU Media Worker

The Vercel app is the control plane. This worker runs on the machine with the NVIDIA GPU and performs real-time face processing.

## Pipeline

Camera frames -> WebSocket -> Deep-Live-Cam / InsightFace -> JPEG output -> browser canvas MediaStream -> WebRTC/WHIP/recording.

## Windows + NVIDIA setup

Use Python 3.11 in a dedicated virtual environment. Install the worker dependencies, then ensure the pinned Deep-Live-Cam submodule is present at `vendor/DeepLiveCam`.

The current Deep-Live-Cam CUDA guidance uses CUDA 12.8, cuDNN 8.9.7 for CUDA 12.x, PyTorch CUDA wheels, and ONNX Runtime GPU. See the upstream README before installing the CUDA stack.

Models required by the renderer are kept out of Git:

- `vendor/DeepLiveCam/models/inswapper_128_fp16.onnx`
- the InsightFace `buffalo_l` analysis models, normally downloaded to the user's InsightFace model cache

Never commit user photos, camera frames, voice recordings, or model weights to the application repository.

## Start

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r worker/requirements.txt
uvicorn worker.gpu_worker:app --host 0.0.0.0 --port 8787
```

Set the frontend environment:

`VITE_LIVESIM_GPU_WORKER_URL=http://YOUR_GPU_MACHINE:8787`

For a public deployment, put the worker behind HTTPS/WSS and authentication rather than exposing the development port directly.

## API

- `GET /health`
- `GET /capabilities`
- `POST /sessions`
- `POST /sessions/{id}/source` — upload the authorized avatar portrait
- `WS /sessions/{id}/driver` — binary JPEG camera frames in, processed JPEG frames out
- `GET /sessions/{id}`
- `DELETE /sessions/{id}`

The worker keeps the face model loaded for the session instead of launching a new inference process for every frame.

## Important

Vercel does not run the GPU inference process. The worker must be running on an NVIDIA/CUDA machine. If the worker is offline, LiveSim Lab keeps the renderer unavailable instead of pretending that the browser motion preview is neural synthesis.
