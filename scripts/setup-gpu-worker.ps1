$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root
if (-not (Get-Command python -ErrorAction SilentlyContinue)) { throw "Python 3 is required." }
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw "Git is required." }
if (-not (Test-Path ".venv")) { python -m venv .venv }
& ".\.venv\Scripts\python.exe" -m pip install --upgrade pip
& ".\.venv\Scripts\python.exe" -m pip install -r worker\requirements.txt
if (-not (Test-Path "vendor\DeepLiveCam\run.py")) {
  New-Item -ItemType Directory -Force -Path "vendor" | Out-Null
  git clone --depth 1 https://github.com/hacksider/Deep-Live-Cam.git vendor\DeepLiveCam
}
Write-Host ""
Write-Host "LiveSim GPU worker environment is ready." -ForegroundColor Green
Write-Host "Next: verify NVIDIA/CUDA, then run:"
Write-Host "  .\.venv\Scripts\python.exe -m uvicorn worker.gpu_worker:app --host 127.0.0.1 --port 8787"
Write-Host "Health: http://127.0.0.1:8787/health"
Write-Host "Keep this worker localhost-only until HTTPS/WSS authentication is configured."