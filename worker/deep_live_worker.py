"""LiveSim Lab Deep-Live-Cam worker bridge.

Runs outside Vercel on a machine/container with Python, FFmpeg and an appropriate
ONNX Runtime execution provider. The frontend never fabricates a successful
processing result: if this worker is unavailable, the UI stays disabled.
"""
import os, subprocess, tempfile
from pathlib import Path
from fastapi import FastAPI, File, Form, UploadFile, HTTPException
from fastapi.responses import FileResponse

APP=FastAPI(title='LiveSim Lab Deep-Live-Cam Worker')
ROOT=Path(__file__).resolve().parents[1]
ENGINE=ROOT/'vendor'/'DeepLiveCam'/'run.py'
WORK=Path(os.getenv('LIVESIM_WORK_DIR','/tmp/livesimlab'))
WORK.mkdir(parents=True,exist_ok=True)

@app.get('/health')
def health():
 return {'ok':ENGINE.exists(),'engine':'DeepLiveCam','source':'lightbatis/DeepLiveCam','mode':'worker'}

@app.post('/process')
async def process(source:UploadFile=File(...),target:UploadFile=File(...),provider:str=Form('cpu'),enhance:bool=Form(True),manyFaces:bool=Form(False),mouthMask:bool=Form(False),keepFps:bool=Form(True),keepAudio:bool=Form(True),keepFrames:bool=Form(False),encoder:str=Form('libx264'),quality:int=Form(23)):
 if not ENGINE.exists(): raise HTTPException(503,'Deep-Live-Cam source is not mounted on the worker')
 if source.content_type and not source.content_type.startswith('image/'): raise HTTPException(400,'Source must be an image')
 if target.content_type and not (target.content_type.startswith('video/') or target.content_type.startswith('image/')): raise HTTPException(400,'Target must be an image or video')
 job=WORK/tempfile.NamedTemporaryFile(prefix='job-',delete=False).name.split('/')[-1]
 d=WORK/job;d.mkdir()
 src=d/'source';tgt=d/'target';out=d/'output';out.mkdir()
 src.write_bytes(await source.read());tgt.write_bytes(await target.read())
 cmd=['python',str(ENGINE),'--source',str(src),'--target',str(tgt),'--output',str(out),'--execution-provider',provider,'--video-encoder',encoder,'--video-quality',str(quality)]
 processors=['face_swapper'];
 if enhance: processors.append('face_enhancer')
 cmd += ['--frame-processor',*processors]
 if keepFps: cmd.append('--keep-fps')
 if keepAudio: cmd.append('--keep-audio')
 if keepFrames: cmd.append('--keep-frames')
 if manyFaces: cmd.append('--many-faces')
 try:
  p=subprocess.run(cmd,cwd=ENGINE.parent,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,timeout=int(os.getenv('LIVESIM_PROCESS_TIMEOUT','1800')))
 except subprocess.TimeoutExpired: raise HTTPException(504,'Processing timed out')
 if p.returncode!=0: raise HTTPException(500,p.stdout[-3000:] or 'Deep-Live-Cam failed')
 files=[x for x in out.rglob('*') if x.is_file()]
 if not files: raise HTTPException(500,'Engine completed without an output artifact')
 return {'ok':True,'job':job,'artifact':str(files[0].name),'log':p.stdout[-4000:]}

@app.post('/live/start')
def live_start(provider:str=Form('cpu')):
 return {'ok':False,'error':'Live camera inference requires a persistent GPU worker and capture pipeline; configure that worker before enabling this route.'}
