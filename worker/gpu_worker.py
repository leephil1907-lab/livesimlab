"""LiveSim Lab persistent GPU media worker."""
import os,time,uuid,asyncio,json
from typing import Dict
from fastapi import FastAPI,WebSocket,WebSocketDisconnect,HTTPException,UploadFile,File
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from realtime_deep_live import RealtimeRenderer

app=FastAPI(title="LiveSim Lab GPU Media Worker")
app.add_middleware(CORSMiddleware, allow_origins=os.getenv("LIVESIM_GPU_CORS","*").split(","), allow_credentials=False, allow_methods=["*"], allow_headers=["*"])
sessions: Dict[str,dict]={}
renderers: Dict[str,RealtimeRenderer]={}
RENDERER=os.getenv("LIVE_RENDERER_BACKEND","deep-live-cam")
GPU_PROVIDER=os.getenv("LIVE_GPU_PROVIDER","cuda")

@app.get("/health")
def health():
    return {"ok":True,"service":"livesim-gpu-worker","renderer":RENDERER,"gpu_provider":GPU_PROVIDER,"sessions":len(sessions)}

@app.get("/capabilities")
def capabilities():
    loaded=any(r is not None and r.ready for r in renderers.values())
    return {"renderer":RENDERER,"gpu_provider":GPU_PROVIDER,"modes":["avatar-driver","face-reenactment"],"input":["webcam"],"output":["jpeg-websocket"],"persistent":True,"neural":loaded,"modelLoaded":loaded}

@app.post("/sessions")
def create_session():
    sid="lsgpu_"+uuid.uuid4().hex[:16]
    try:
        renderers[sid]=RealtimeRenderer(GPU_PROVIDER)
        status="ready"
    except Exception as exc:
        status="renderer-error"
        renderers[sid]=None
        sessions[sid]={"created":time.time(),"frames":0,"last_frame":0,"status":status,"error":str(exc)}
        return {"sessionId":sid,"status":status,"renderer":RENDERER,"gpuProvider":GPU_PROVIDER,"error":str(exc)}
    sessions[sid]={"created":time.time(),"frames":0,"last_frame":0,"status":status}
    return {"sessionId":sid,"status":status,"renderer":RENDERER,"gpuProvider":GPU_PROVIDER}

@app.post("/sessions/{sid}/source")
async def set_source(sid:str,source:UploadFile=File(...)):
    renderer=renderers.get(sid)
    if not renderer: raise HTTPException(404,"GPU renderer session not found")
    payload=await source.read()
    frame=renderer.decode(payload)
    if frame is None: raise HTTPException(400,"Invalid avatar image")
    try:
        renderer.set_source(frame)
    except Exception as exc:
        raise HTTPException(400,str(exc))
    sessions[sid]["status"]="source-ready"
    return {"ok":True,"status":"source-ready"}
@app.get("/sessions/{sid}")
def session_status(sid:str):
    s=sessions.get(sid)
    if not s: raise HTTPException(404,"GPU session not found")
    return {"sessionId":sid,**s}

@app.delete("/sessions/{sid}")
def delete_session(sid:str):
    if not sessions.pop(sid,None): raise HTTPException(404,"GPU session not found")
    renderers.pop(sid,None)
    return {"ok":True}

@app.websocket("/sessions/{sid}/driver")
async def driver(ws:WebSocket,sid:str):
    await ws.accept()
    s=sessions.get(sid); renderer=renderers.get(sid)
    if not s or not renderer or not renderer.ready:
        await ws.send_json({"type":"error","message":"GPU renderer is not ready"})
        await ws.close(code=4503); return
    try:
        while True:
            msg=await ws.receive()
            if msg.get("bytes") is not None:
                frame=renderer.decode(msg["bytes"])
                if frame is None: continue
                started=time.perf_counter()
                output=await asyncio.to_thread(renderer.process,frame)
                await ws.send_bytes(renderer.encode(output))
                s["frames"]+=1
                s["last_frame"]=time.time()
                s["fps"]=round(1/max(0.001,time.perf_counter()-started),1)
                s["status"]="processing"
            elif msg.get("text"):
                data=json.loads(msg["text"])
                if data.get("type")=="ping": await ws.send_json({"type":"pong","t":data.get("t")})
                elif data.get("type")=="stop": s["status"]="stopped"; break
    except WebSocketDisconnect:
        s["status"]="disconnected"
    except Exception as exc:
        s["status"]="error"; s["error"]=str(exc)

@app.get("/")
def root():
    loaded=any(r is not None and r.ready for r in renderers.values())
    return JSONResponse({"service":"LiveSim Lab GPU Worker","status":"online","renderer":RENDERER,"neuralModelLoaded":loaded,"tokenProtected":false})
