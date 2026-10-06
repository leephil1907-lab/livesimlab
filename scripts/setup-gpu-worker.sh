#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
command -v python3 >/dev/null || { echo "Python 3 is required."; exit 1; }
command -v git >/dev/null || { echo "Git is required."; exit 1; }
python3 -m venv .venv
. .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r worker/requirements.txt
if [ ! -f vendor/DeepLiveCam/run.py ]; then
  mkdir -p vendor
  git clone --depth 1 https://github.com/hacksider/Deep-Live-Cam.git vendor/DeepLiveCam
fi
echo "LiveSim GPU worker environment is ready."
echo "Run: .venv/bin/python -m uvicorn worker.gpu_worker:app --host 127.0.0.1 --port 8787"
echo "Health: http://127.0.0.1:8787/health"
echo "Keep the worker localhost-only until HTTPS/WSS authentication is configured."