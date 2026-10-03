# LiveSim audio into real calls

OBS Virtual Camera is video. Operating-system audio routing is required for a processed voice to appear as the microphone in Zoom/Meet/WhatsApp/Telegram.

## Windows

Install an authorized virtual audio device such as VB-CABLE. In OBS:
1. Add the LiveSim Browser Source as an audio source.
2. In Advanced Audio Properties, monitor the LiveSim voice source.
3. Set OBS monitoring to the virtual cable output.
4. In Zoom/Meet/WhatsApp/Telegram select the virtual cable as the microphone.
5. Disable browser/local monitoring if it creates an echo.

The exact device names depend on the installed driver.

## macOS

Use an authorized virtual audio driver such as BlackHole or an equivalent. Route the OBS LiveSim audio source to that device, then select it as the call microphone.

## Important

The browser cannot create an operating-system virtual microphone by itself. Do not claim that the OBS Virtual Camera carries audio. The video path and audio path are separate:

LiveSim video → OBS → Virtual Camera → platform camera

LiveSim voice → OBS Browser Source → OBS monitor → OS virtual audio device → platform microphone

For Zoom native Production Studio, a desktop native SDK adapter can bypass the virtual-audio-device path and send PCM directly with PSSender.