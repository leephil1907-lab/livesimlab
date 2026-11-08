# Reachmark FaceHub — Deep-Live-Cam source integration

The upstream Deep-Live-Cam project is vendored into this repository at `vendor/Deep-Live-Cam/` by the GitHub Actions workflow `.github/workflows/vendor-deep-live-cam.yml`.

- Upstream: https://github.com/hacksider/Deep-Live-Cam
- Pinned upstream revision: `08896a51c9a6198f50dc9f7508acf39fc460c8f1`
- Upstream licence: preserve `vendor/Deep-Live-Cam/LICENSE` and the upstream notices when modifying or redistributing those files.
- The workflow replaces the temporary Git submodule pointer with the actual tracked source files and commits them to `main`.

**Build distinction:** the upstream project is a desktop Python application. Vendoring its source makes the complete source tree available in FaceHub; it does not automatically convert its desktop UI into a headless web worker or make a hosted CPU service GPU-capable. FaceHub's existing web application and `worker/` service remain separate. The existing worker is the web-streaming integration point and must be adapted/tested against the vendored engine before claiming Deep-Live-Cam-backed live sessions.

