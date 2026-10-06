# LiveSim GPU worker setup

The production Vercel app is the control plane. The neural renderer must run on a machine with an NVIDIA GPU; the RTX 4050 laptop is the intended first host.

## 1. Install the worker

On Windows PowerShell:

    powershell -ExecutionPolicy Bypass -File .\scripts\setup-gpu-worker.ps1

On Linux/macOS:

    ./scripts/setup-gpu-worker.sh

The bootstrap installs the Python dependencies and downloads the upstream Deep-Live-Cam source into vendor/DeepLiveCam. Model weights are not committed to Git.

## 2. Verify CUDA before starting LiveSim

Run:

    python -c "import torch; print(torch.cuda.is_available()); print(torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'CPU')"

The worker must not be advertised as neural/GPU-ready until its face-swap model actually loads.

## 3. Start the worker

    python -m uvicorn worker.gpu_worker:app --host 127.0.0.1 --port 8787

Check /health and /capabilities. A running HTTP service is not the same thing as a loaded renderer; the capability response reports whether a renderer session has successfully loaded the model.

## 4. Connect the production UI

A Vercel deployment cannot reach 127.0.0.1 on your laptop. For a production session, expose the worker through an HTTPS/WSS tunnel or deploy it to a GPU host. Only then set:

    LIVESIM_GPU_WORKER_URL=https://your-secure-worker.example
    VITE_LIVESIM_GPU_WORKER_URL=https://your-secure-worker.example

Do not expose port 8787 directly to the public internet. Put authentication and HTTPS/WSS in front of it.

## 5. Remaining build order

1. GPU face renderer — camera to rendered frames.
2. Voice worker — authorized reference to speech output.
3. Media bridge — rendered video/audio to OBS.
4. WHIP/WebRTC gateway — rendered stream to compatible ingest.
5. Destination adapters — OBS first, then supported platform workflows.
6. OAuth only where it unlocks a real supported platform action.

LiveSim should show ready only after each stage passes its real preflight check. No environment variable alone should create a connected/online badge.