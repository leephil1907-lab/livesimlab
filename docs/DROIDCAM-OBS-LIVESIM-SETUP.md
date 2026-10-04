# DroidCam + OBS + LiveSimLab

LiveSim uses DroidCam as a physical camera source through the official DroidCam OBS Source plugin. The plugin supports Android/iOS sources, USB/Wi-Fi transport, high-resolution capture, low-latency transfer, multiple devices, and hardware acceleration. See the upstream project: https://github.com/dev47apps/droidcam-obs-plugin

## Production signal path

```text
Android / iPhone
      ↓
DroidCam
      ↓
OBS — DroidCam Source
      ↓
LiveSim capture / processing scene
      ↓
Face tracking → authorized avatar renderer
      ↓
Background / scene compositor
      ↓
OBS Program Output
      ├── OBS Virtual Camera → Zoom / Meet / WhatsApp / other webcam apps
      └── OBS Stream Output → one selected live destination
```

## First-time setup

1. Install OBS Studio on the desktop host.
2. Install the DroidCam mobile application on the phone.
3. Install the **DroidCam OBS Source** plugin from the official DroidCam project.
4. Open OBS and create a `LiveSim Camera` scene.
5. Add **DroidCam Source** and complete the USB or Wi-Fi pairing.
6. Start with 720p/30 FPS. Increase resolution only after the processing pipeline is stable.
7. Confirm the camera is visible in the OBS preview before opening LiveSim processing.
8. In LiveSim, run the preflight checks. Camera frames must be arriving before the GPU/face worker is started.
9. Select the desired avatar/target and authorized voice profile.
10. Confirm the processed preview moves with your real camera before starting an external call or stream.
11. Start **OBS Virtual Camera** only after the program scene is correct.
12. Open exactly one destination application and select `OBS Virtual Camera` as its camera.

## USB vs Wi-Fi

Use USB when the priority is predictable latency and stability. Use Wi-Fi when cable-free operation is more important and the phone/desktop network is stable. Do not switch transport during an active production session unless the input has been stopped first.

## LiveSim preflight states

- `PHONE_READY`: phone source exists.
- `OBS_READY`: OBS/DroidCam source is configured.
- `VIDEO_FLOWING`: frames are arriving at the expected cadence.
- `TRACKER_READY`: face tracking has a usable subject.
- `RENDERER_READY`: the authorized neural/avatar worker is loaded.
- `VOICE_READY`: the selected authorized voice profile is available.
- `PROGRAM_READY`: processed video and audio are present in the program scene.
- `VIRTUAL_CAMERA_READY`: OBS Virtual Camera is available.
- `DESTINATION_READY`: one selected call/stream destination is ready.

The studio should block `Start Call` / `Go Live` until the required checks for the selected mode pass.

## Troubleshooting

### DroidCam source is black

Check the phone connection first, then remove/re-add the DroidCam Source in OBS. Verify the phone camera is available to DroidCam before debugging LiveSim.

### OBS preview works but LiveSim has no frames

Check the LiveSim capture/bridge status. The web control plane cannot directly access an arbitrary desktop camera from a remote browser deployment; the desktop bridge/OBS path must be running locally.

### Processed video is smooth but external call is wrong

Verify the external application is using `OBS Virtual Camera`, not the physical DroidCam device. The external application should consume the final OBS program output.

### Audio is delayed

Keep microphone capture, voice conversion, and output on the same desktop audio clock where possible. Do not route the raw microphone and processed voice to the destination simultaneously.

## Important boundary

LiveSim is the control and production layer. The physical camera, OBS, virtual camera, GPU inference, and OS-level audio routing remain desktop-host capabilities. Vercel hosts the web control plane; it does not turn a browser deployment into a local webcam/OBS driver.
