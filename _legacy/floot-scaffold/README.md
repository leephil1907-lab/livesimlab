# Legacy Floot scaffold

This directory preserves the unused Floot-era endpoint, helper, and page scaffold that was present in the repository before the Vite/React control-room architecture.

It is intentionally quarantined rather than silently discarded.

The active application uses:
- Vite + React under src/
- Vercel-style API handlers under api/
- the local bridge under bridge/
- GPU/voice workers under worker/

The legacy files are not imported by the active build and their old database dependencies are intentionally not installed.
