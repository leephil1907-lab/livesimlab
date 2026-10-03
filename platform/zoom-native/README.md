# LiveSim Zoom Native Media Bridge

This is the native desktop adapter boundary for Zoom Production Studio.

## Why this exists

The browser control plane can create/open Zoom meetings and OBS can provide a webcam. For direct raw media injection into Zoom, the supported route is the native Meeting SDK Production Studio API. Zoom requires the app to join the meeting, verify Production Studio support/host permissions, wait for `onStartSend`, then call `sendVideoFrame` and `sendAudio` with the declared formats.

The repository intentionally does not vendor Zoom's proprietary SDK binaries or credentials.

## Contract

The native bridge should expose localhost IPC/WebSocket:

- `GET /health`
- `GET /capabilities`
- `POST /sessions` — meeting number + role
- `POST /sessions/:id/start` — start PS mode
- binary `/sessions/:id/video` — I420 frames
- binary `/sessions/:id/audio` — 48 kHz mono PCM
- `POST /sessions/:id/stop`

The source of both streams is the same LiveSim output used by OBS, so the console can select either:

1. **OBS transport:** LiveSim → OBS → Virtual Camera/Audio → platform.
2. **Native Zoom transport:** LiveSim → Zoom Meeting SDK PSSender.

The native adapter must never claim readiness until the SDK reports `onStartSend`.

## Windows/macOS implementation

Implement the adapter with the current Zoom Meeting SDK for the target desktop OS. On Windows, use `IMeetingProductionStudioController` and `IZoomSDKPSSender`; on macOS use the corresponding Production Studio controller and sender.

Zoom's documented Production Studio flow is host/co-host only and requires exact video capability/format matching. Audio can be 32 kHz or 48 kHz mono; 48 kHz is recommended.

Official reference:
https://developers.zoom.us/docs/meeting-sdk/windows/default-ui/advanced-features/production-studio-mode/

Do not copy Zoom SDK headers/binaries into this repository unless their redistribution terms explicitly permit it.
