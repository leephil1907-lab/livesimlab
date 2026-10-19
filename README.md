# Reachmark FaceHub

Reachmark FaceHub is a live media studio for **authorized synthetic/avatar media**, controlled recordings, and real platform workflows where the platform exposes a supported transport.

## Current media path

```text
Phone / Camera
  ↓
DroidCam
  ↓
OBS — DroidCam Source
  ↓
FaceHub capture + browser tracking
  ↓
RTX / Deep-Live-Cam renderer (optional local GPU worker)
  ↓
Rendered canvas / MediaStream
  ↓
Local desktop bridge
  ↓
OBS scene + browser-source audio
  ↓
OBS Virtual Camera
  ↓
Zoom / Meet / other webcam applications
```

The official DroidCam OBS Source is the supported camera bridge for Android/iOS into OBS. It supports high-resolution capture, low-latency Wi-Fi/USB transport, multiple devices, and hardware acceleration. urlDroidCam OBS Pluginhttps://github.com/dev47apps/droidcam-obs-plugin

See the complete setup and troubleshooting runbook in [`docs/DROIDCAM-OBS-LIVESIM-SETUP.md`](docs/DROIDCAM-OBS-LIVESIM-SETUP.md).

OBS's Virtual Camera exposes the selected OBS scene as a webcam to applications that accept webcam input. urlOBS Virtual Camera Guidehttps://obsproject.com/kb/virtual-camera-guide

The local bridge is `bridge/server.py`. It is deliberately bound to `127.0.0.1` by default and accepts JPEG video frames and generated WAV audio over local WebSockets. OBS loads `http://127.0.0.1:8788/obs` as a Browser Source. OBS Browser Source can render custom web content and audio/video tasks. urlOBS Browser Source Guidehttps://obsproject.com/kb/browser-source

## Desktop preflight

The Reachmark FaceHub control plane includes a browser-safe DroidCam/OBS preflight helper at `src/lib/droidcamPreflight.js`. It checks camera enumeration and the local LiveSim bridge without assuming that a camera exists simply because the website loaded. A camera permission request is explicit.

The intended order is:

1. Phone connected through DroidCam.
2. DroidCam Source visible in OBS.
3. Reachmark FaceHub receives frames.
4. Face tracker locks to the subject.
5. Neural/avatar renderer becomes ready.
6. Authorized voice becomes ready.
7. OBS Program output is correct.
8. OBS Virtual Camera starts.
9. User selects that virtual camera in exactly one call/stream destination.

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

The RTX worker requires model weights that are intentionally excluded from Git. Configure the local NVIDIA machine or a compatible GPU host and run the worker there. The web control plane and GPU inference are separate services; the deployment host does not need to provide GPU hardware.

## Authorized voice → TTS

`worker/voice_worker.py` provides a persistent F5-TTS adapter:

1. upload a reference recording;
2. provide the exact reference transcript;
3. explicitly confirm that the voice is owned/authorized;
4. create a local voice profile;
5. send text to `/synthesize`;
6. receive a WAV result.

The public F5-TTS checkpoints have a separate model-weight license and are currently non-commercial; use a properly licensed checkpoint for commercial deployment. urlF5-TTS repositoryhttps://github.com/SWivid/F5-TTS

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

Reachmark FaceHub's desktop path is:

`Reachmark FaceHub → OBS scene → OBS Virtual Camera → Zoom`.

### Google Meet

OAuth can create a real Meet space and return its meeting URI. The current public Meet Media API does not provide a browser-side path for sending Reachmark FaceHub's custom outgoing media into a conference. Use the OBS Virtual Camera as the webcam source in the Meet client.

### WhatsApp

WhatsApp is not treated as a fake OAuth provider. Reachmark FaceHub can open the WhatsApp web client, but it does not claim an official generic API for starting a user's arbitrary personal video call or selecting a webcam. The user starts/joins the call in the official client and selects the OBS Virtual Camera where supported.

### TikTok

The current adapter verifies TikTok Content Posting authorization. It does not mislabel Content Posting as a generic LIVE ingest API.

## One destination at a time

Reachmark FaceHub intentionally does **not** broadcast a call/stream to every connected platform. A session has one active destination. Connecting an account only makes it available; the user must select the destination, pass preflight, then start that session.

## Live control endpoint

`GET /api/live` is an explicit capability/status endpoint. It reports the active session and supported transport boundary instead of pretending unsupported external media injection exists.

## Safety boundary

- Use only faces/media you own or are authorized to use.
- Use only voices you own or have explicit permission to clone.
- Synthetic/avatar media should remain clearly disclosed where appropriate.
- Provider credentials never belong in browser JavaScript or Git.
- The local OBS WebSocket should remain localhost-only and password protected.

## Custom RTMP publishing boundary

The browser cannot publish RTMP directly. FaceHub's custom RTMP path uses WHIP/WebRTC to reach a configured media gateway; that gateway must then forward the session to the chosen RTMP ingest target.

For the current client to request a custom RTMP output:

- Set `VITE_LIVESIM_WHIP_URL` to the gateway's WHIP publish endpoint.
- Set `VITE_LIVESIM_RTMP_OUTPUT_ID` to a **non-secret output identifier**.
- Configure the gateway out of band so it maps the request headers `X-LiveSim-Destination: rtmp` and `X-LiveSim-Output-Id: <id>` to an RTMP target.
- Keep the RTMP URL and stream key in the gateway's server-side configuration, never in Vite/browser environment variables.
- Confirm the gateway supports this routing contract, that its RTMP output is connected, and that the destination platform shows incoming video. A successful WHIP SDP exchange alone does not prove downstream RTMP delivery.

If the output ID or WHIP URL is missing, FaceHub blocks the start action and records the missing configuration. No RTMP credentials are stored by the browser. A generic WHIP server does not automatically provide RTMP forwarding; the forwarding service and output mapping are additional required components.

## Voice-processing boundary

The live studio's voice-profile field is currently a profile reference, not an audio-processing chain. The separate voice worker can synthesize speech, but its output is not yet mixed into the live camera/screen stream as real-time voice conversion. For live voice transformation, configure a compatible low-latency voice-conversion worker and integrate its audio output into the published MediaStream; do not treat a profile ID or a successful video publish as proof of processed voice.

## Deployment architecture

Reachmark FaceHub is designed to be host-portable. Deploy the web control plane to a persistent Node-compatible host that supports the required API routes and WebSocket proxying, and deploy GPU inference to a separate CUDA-capable host. Keep worker endpoints and session secrets in server-side environment variables. Validate health checks, WebSocket frame delivery, CORS/origin rules, and session cleanup after deployment; a successful frontend build alone does not verify neural output.

## Desktop setup

### GPU worker

```bash
python -m venv .venv
pip install -r worker/requirements.txt
uvicorn worker.gpu_worker:app --host 127.0.0.1 --port 8787
```

Set `VITE_LIVESIM_GPU_WORKER_URL=http://127.0.0.1:8787`.

### Voice worker

```bash
pip install -r worker/requirements.txt
python worker/voice_worker.py
```

Set `VITE_LIVESIM_VOICE_WORKER_URL=http://127.0.0.1:8790`.

### OBS bridge

```bash
python bridge/server.py
```

Then connect the OBS Bridge workspace and use **Attach FaceHub source** followed by **Start virtual camera**.

## Build

```bash
npm install
npm run build
```

The production web app is the control plane. GPU inference and OS-level media devices remain on the desktop host.


## Deployment target: persistent Node container

The app now includes a Dockerfile, `server.mjs`, and `railway.json` so the browser studio and its existing `api/*.js` control-plane handlers can run in a persistent Node service instead of relying on Vercel Functions. The Node adapter preserves the common Vercel handler interface (`req.query`, `req.body`, `res.status()`, `res.json()`, and `res.redirect()`) and serves the Vite build as a single-page app.

### Deploy to Railway

1. Create a Railway project and deploy this repository from the `main` branch.
2. Railway detects `railway.json` and builds the included Dockerfile.
3. Set the required server-side environment variables in Railway Variables. At minimum, configure a random `LIVESIM_SESSION_SECRET` with at least 32 characters and `LIVESIM_PUBLIC_ORIGIN` to the final public HTTPS origin.
4. Configure OAuth client credentials and callback URLs only for providers you actually enable. Keep all secrets server-side.
5. Confirm `/healthz` returns `{ "ok": true }`, then test `/api/health`, sign-in callbacks, and the studio on the Railway domain before moving any custom domain.
6. Keep the current Vercel deployment available until the Railway deployment passes those checks. Update OAuth callback URLs and DNS only during the final cutover.

### Important processing boundary

Moving the app off Vercel does **not** create a GPU worker. Railway runs the web app and persistent API; neural face processing still requires an independently reachable GPU worker or compatible hosted inference API. The browser tracker is a preview/tracking layer, not a replacement for neural inference. Do not set worker URLs until those services are actually deployed and reachable.

The `/healthz` endpoint checks only that the Node process is serving requests. `/api/health` separately reports configuration readiness. A configured URL is not proof that a remote worker is healthy, so perform a real camera-to-output test before declaring the media pipeline ready.
