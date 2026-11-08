# FaceHub: Deep-Live-Cam integration and Render deployment

## Live request and billing path

FaceHub's Node application remains the control plane:
- Account cookie authentication gates `POST /api/live/start` and `/ws/live`.
- Character ownership is checked before a session starts.
- Credits are reserved transactionally before the browser WebSocket is admitted.
- The Node relay authenticates to the GPU worker with `GPU_WORKER_TOKEN`.
- Credits are metered only while rendered frames are flowing; unused reserved credits are refunded on session close.

The browser never connects directly to the worker. The worker accepts only the shared bearer token, and its session identifier is generated server-side.

## Deep-Live-Cam engine adaptation

The worker now calls Deep-Live-Cam's affine-aware paste-back implementation after InsightFace/inswapper returns the aligned face and affine matrix. This adopts the upstream optimized feathered paste-back and its blending path while preserving FaceHub's existing worker session API, WebSocket protocol, motion smoothing, strength control, and FaceHub billing.

Only the headless `modules` processor package is copied into the worker image. The desktop PySide/Tkinter application and local camera capture are not launched. A small headless logging shim replaces the processor's desktop status callback.

## Build and test

Build from the repository root (not from `worker/`, because the worker image needs the vendored source):

```sh
docker build -f worker/Dockerfile -t facehub-worker .
docker run --gpus all -p 8787:8787 \
  -e WORKER_TOKEN='use-a-long-random-secret' \
  -e PROVIDER=cuda facehub-worker
```

Check readiness:

```sh
curl -H 'Authorization: Bearer YOUR_WORKER_TOKEN' http://localhost:8787/health
```

Expected healthy response includes `"modelLoaded": true` and a CUDA provider. The worker downloads the InsightFace pack and inswapper model during image build. Keep the worker image private and protect its endpoint with a long random token and network restrictions.

For the web app:

```sh
npm ci
npm run build
npm run smoke
```

The smoke test exercises the app's HTTP and application flows. A complete live test still requires a compatible NVIDIA host and a real authenticated browser session with a funded account.

## Render architecture

`render.yaml` prepares the FaceHub web service as a Docker deployment with:
- repository-root build context and root `Dockerfile`
- `/healthz` health check
- persistent `/data` disk for SQLite, uploads, and generated session secret
- production cookie/proxy settings
- secret prompts for Paystack and GPU worker credentials
- test engine and demo payments disabled

**GPU hosting boundary:** Render's published compute plans describe CPU and RAM resources; they do not document an NVIDIA CUDA GPU service plan. Therefore this Blueprint provisions the web app only. Run the GPU worker on a separate NVIDIA-backed host/provider and set `GPU_WORKER_URL` to its HTTPS endpoint and `GPU_WORKER_TOKEN` to the same secret as the worker's `WORKER_TOKEN`. Do not deploy the CUDA worker on a CPU-only Render instance and describe it as GPU-accelerated. CPU mode is for limited smoke testing, not low-latency live production.

The Blueprint is preparation only. It does not create or change any Render service until you review and approve the Blueprint in Render.
