"""Download the face models into worker/models (≈ 600 MB, one time).

  python worker/download_models.py
"""
import os
import sys
import urllib.request
import zipfile
from pathlib import Path

MODELS_DIR = Path(os.getenv("MODELS_DIR", Path(__file__).resolve().parent / "models"))
FILES = {
    "inswapper_128_fp16.onnx": "https://huggingface.co/hacksider/deep-live-cam/resolve/main/inswapper_128_fp16.onnx",
}
BUFFALO_URL = "https://github.com/deepinsight/insightface/releases/download/v0.7/buffalo_l.zip"


def fetch(url: str, dest: Path) -> None:
    tmp = dest.with_suffix(dest.suffix + ".part")
    print(f"↓ {dest.name}")
    def progress(blocks, block_size, total):
        if total > 0:
            pct = min(100, blocks * block_size * 100 // total)
            sys.stdout.write(f"\r  {pct:3d}%  of {total / 1e6:.0f} MB"); sys.stdout.flush()
    urllib.request.urlretrieve(url, tmp, progress)
    tmp.rename(dest)
    print()


def main() -> None:
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    for name, url in FILES.items():
        dest = MODELS_DIR / name
        if dest.exists() and dest.stat().st_size > 1_000_000:
            print(f"✔ {name} already present")
        else:
            fetch(url, dest)
    buffalo = MODELS_DIR / "models" / "buffalo_l"
    if (buffalo / "det_10g.onnx").exists():
        print("✔ buffalo_l already present")
    else:
        buffalo.mkdir(parents=True, exist_ok=True)
        zpath = MODELS_DIR / "buffalo_l.zip"
        fetch(BUFFALO_URL, zpath)
        with zipfile.ZipFile(zpath) as z:
            for member in z.namelist():
                if member.endswith(".onnx"):
                    (buffalo / Path(member).name).write_bytes(z.read(member))
        zpath.unlink()
    print(f"\nModels ready in {MODELS_DIR}")


if __name__ == "__main__":
    main()
