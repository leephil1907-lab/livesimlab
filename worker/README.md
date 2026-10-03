# LiveSim GPU + voice workers

These workers run on the desktop NVIDIA machine. The Vercel app is only the browser/control plane.

## Face / expression pipeline

```text
Camera JPEG
  -> WebSocket /sessions/{id}/driver
  -> Deep-Live-Cam / InsightFace model (loaded once)
  -> target source face
  -> frame-level face swap / expression transfer
  -> JPEG output
  -> browser canvas MediaStream
  -> local OBS bridge
```

The worker does not claim neural output until the renderer model has successfully loaded. POST /sessions returns status=ready only after the face-swap model is instantiated.

Required model weights are downloaded/managed by the Deep-Live-Cam dependency and are intentionally not committed to Git.

## Voice / TTS pipeline

```text
Authorized reference audio + transcript
  -> /profiles
  -> persistent F5-TTS model
  -> /synthesize
  -> WAV
```

Start:

```bash
pip install -r worker/requirements.txt
uvicorn worker.gpu_worker:app --host 127.0.0.1 --port 8787
python worker/voice_worker.py
```

The public F5-TTS checkpoints currently have a non-commercial model-weight license. For a commercial product, configure a checkpoint whose training data and model weights are properly licensed for that use.

## GPU requirements

NVIDIA/CUDA is preferred. The RTX 4050 desktop path should be configured with a compatible NVIDIA driver and CUDA-enabled PyTorch/ONNX Runtime. The worker reports its selected provider at /health and /capabilities.

## Security

- Bind local workers to 127.0.0.1 unless remote access is deliberately required.
- If a remote worker is exposed, put it behind HTTPS/WSS plus authentication.
- Do not store provider OAuth secrets in these workers.
- Use only authorized voice references and target faces.
- Keep uploaded voice samples and model weights out of Git.