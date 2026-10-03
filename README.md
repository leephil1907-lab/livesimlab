# LiveSim Lab

LiveSim Lab is a transparent media-research studio for **authorized synthetic/avatar media**, controlled recordings, and real platform workflows where the platform exposes a supported transport.

## Current media path

```text
Camera
  ↓
MediaPipe tracking (browser)
  ↓
RTX / Deep-Live-Cam renderer (optional local GPU worker)
  ↓
Rendered canvas / MediaStream
  ↓
Local desktop bridge
  ↓
OBS Browser Source
  ↓
OBS scene
  ↓
OBS Virtual Camera
  ↓
Zoom / Meet / other webcam applications
```

OBS's Virtual Camera exposes the selected OBS scene as a webcam to applications that accept webcam input. urlOBS Virtual Camera Guidehttps://obsproject.com/kb/virtual-camera-guide

The local bridge is `bridge/server.py`. It is deliberately bound to `127.0.0.1` by default and accepts JPEG frames over a local WebSocket. OBS loads `http://127.0.0.1:8788/obs` as a Browser Source. OBS Browser Source can render custom web content and audio/video tasks. urlOBS Browser Source Guidehttps://obsproject.com/kb/browser-source

## Neural face renderer

`worker/gpu_worker.py` keeps a Deep-Live-Cam face-swap model loaded for a session:

1. create GPU session;
2. upload the authorized target portrait;
3. detect the target face;
4. receive camera JPEG frames over WebSocket;
5. run the face renderer on each frame;
6. return rendered JPEG frames;
7. publish the rendered canvas to the local OBS bridge.

The browser MediaPipe layer is only the motion/tracking preview. It is **not** presented as neural face synthesis.

The RTX worker requires model weights that are intentionally excluded from Git. Configure the local NVIDIA machine and run the worker there; Vercel is only the control plane.

## Authorized voice → TTS

`worker/voice_worker.py` provides a persistent F5-TTS adapter:

1. upload a reference recording;
2. provide the exact reference transcript;
3. explicitly confirm that the voice is owned/authorized;
4. create a local voice profile;
5. send text to `/synthesize`;
6. receive a WAV result.

The public F5-TTS checkpoints have a separate model-weight license and are currently non-commercial; use a properly licensed checkpoint for commercial deployment. urlF5-TTS repositoryhttps://github.com/SWivid/F5-TTS

The LiveSim voice workflow is restricted to voices the user owns or is explicitly authorized to use.

## OBS control

The **OBS Bridge** workspace connects to OBS WebSocket 5.x on localhost, authenticates with the configured password, creates the `LiveSim Output` Browser Source when needed, and can start/stop the OBS Virtual Camera.

OBS WebSocket is included with modern OBS Studio releases and supports authenticated remote control. urlobs-websocket documentationhttps://github.com/obsproject/obs-websocket

Set:

- `VITE_LIVESIM_OBS_WS_URL=ws://127.0.0.1:4455`
- `VITE_LIVESIM_OBS_SOURCE_URL=http://127.0.0.1:8788/obs`
- `VITE_LIVESIM_MEDIA_BRIDGE_URL=ws://127.0.0.1:8788/ws/publish`

## Platform boundary — now explicit

### Zoom

OAuth now requests the meeting scopes needed to create meetings. The server can create a real Zoom meeting and return its join/start URL.

For custom raw media, Zoom's current Production Studio capability supports host/co-host clients using the Meeting SDK's `PSSender` on supported desktop platforms. That is a native SDK path, not a browser-only OAuth feature. urlZoom Production Studio documentationhttps://developers.zoom.us/docs/meeting-sdk/windows/default-ui/advanced-features/production-studio-mode/

LiveSim's currently implemented desktop path is therefore:

`LiveSim → OBS scene → OBS Virtual Camera → Zoom`.

### Google Meet

OAuth can create a real Meet space and return its meeting URI. The current public Meet Media API is receive-only for conference media and does not support sending a custom outgoing media stream into a conference. urlGoogle Meet Media API referencehttps://developers.google.com/workspace/meet/media-api/reference/cpp/namespace/meet

Therefore LiveSim does **not** claim that its server injects video directly into Meet. Use the OBS Virtual Camera as the webcam source in the Meet client.

### WhatsApp

WhatsApp is not treated as a fake OAuth provider. LiveSim can open the WhatsApp web client, but it does not claim an official generic API for starting a user's arbitrary personal video call or selecting a webcam. The user must start/join the call in the official client and select the OBS Virtual Camera where supported.

### TikTok

The current adapter verifies TikTok Content Posting authorization. It does not mislabel Content Posting as a generic LIVE ingest API.

## Live control endpoint

`GET /api/live` is now an explicit capability/status endpoint. It reports the active session and the supported transport boundary instead of pretending that unsupported external media injection exists.

There is no hidden `501 Not Implemented` live route that claims otherwise.

## OAuth and token handling

Google, Zoom, and TikTok use server-side OAuth code exchange. The browser receives account metadata, not provider access tokens.

Google/Zoom access tokens are refreshed when an external session is started and the token is close to expiry. Tokens are sealed in an HTTP-only Secure SameSite cookie for this repository-stage implementation.

For a multi-user production service, replace the cookie credential store with an authenticated server-side database/KMS-backed token store and implement revocation.

## Safety boundary

- Use only faces/media you own or are authorized to use.
- Use only voices you own or have explicit permission to clone.
- Synthetic/avatar media should remain clearly disclosed where appropriate.
- No real wallet signing or transaction execution.
- Provider credentials never belong in browser JavaScript or Git.
- The local OBS WebSocket should remain localhost-only and password protected.

## Desktop setup

### GPU worker

```bash
python -m venv .venv
# activate the environment
pip install -r worker/requirements.txt
uvicorn worker.gpu_worker:app --host 127.0.0.1 --port 8787
```

Set the Vite environment variable:

```
VITE_LIVESIM_GPU_WORKER_URL=http://127.0.0.1:8787
```

### Voice worker

```bash
pip install -r worker/requirements.txt
python worker/voice_worker.py
```

Set:

```
VITE_LIVESIM_VOICE_WORKER_URL=http://127.0.0.1:8790
```

### OBS bridge

```bash
python bridge/server.py
```

Then connect the OBS Bridge workspace and use **Attach LiveSim source** followed by **Start virtual camera**.

## Build

```bash
npm install
npm run build
```

The production web app is the control plane. GPU inference and OS-level media devices remain on the desktop host.
