# GPU worker image. Run with: docker run --gpus all -p 8787:8787 -e WORKER_TOKEN=... facehub-worker
FROM nvidia/cuda:12.4.1-cudnn-runtime-ubuntu22.04
ENV DEBIAN_FRONTEND=noninteractive PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-pip python3-dev build-essential libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements.txt .
RUN pip3 install --upgrade pip && pip3 install cython && pip3 install -r requirements.txt
COPY gpu_worker.py download_models.py ./
# Bake models into the image so cold starts are fast.
RUN python3 download_models.py
ENV PROVIDER=cuda PORT=8787
EXPOSE 8787
CMD ["python3", "gpu_worker.py"]
