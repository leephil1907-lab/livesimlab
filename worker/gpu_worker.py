"""LiveSim Lab persistent GPU media worker."""
import os,time,uuid
from typing import Dict
from fastapi import FastAPI,WebSocket,WebSocketDisconnect,HTTPException
from fastapi.responses import JSONResponse

app=FastAPI(title="LiveSim Lab GPU Media Worker")
sessions: Dict[str,dict]={}
RENDERER=os.getenv("LIVE_RENDERER_BACKEND","liveportrait")
GPU_PROVIDER=os.getenv("LIVE_GPU_PROVIDER","cuda")

@app.get("/health")
def health():
    return {"ok":True,"service":"livesim-gpu-worker","renderer":RENDERER,"gpu_provider":GPU_PROVIDER,"sessions":len(sessions)}

@app.get("/capabilities")
def capabilities():
    return {"renderer":RENDERER,"gpu_provider":GPU_PROVIDER,"modes":["avatar-driver","face-reenactment"],"input":["webcam","microphone"],"output":["webrtc","whip","recording"],"persistent":True}

@app.post("/sessions")
def create_session():
    sid="lsgpu_"+uuid.uuid4().hex[:16]
    sessions[sid]={"created":time.time(),"frames":0,"last_frame":0,"status":"ready"}
    return {"sessionId":sid,"status":"ready","renderer":RENDERER,"gpuProvider":GPU_PROVIDER}

@app.get("/sessions/{sid}")
def session_status(sid:str):
    s=sessions.get(sid)
    if not s: raise HTTPException(404,"GPU session not found")
    return {"sessionId":sid,**s}

@app.delete("/sessions/{sid}")
def delete_session(sid:str):
    if not sessions.pop(sid,None): raise HTTPException(404,"GPU session not found")
    return {"ok":True}

@app.websocket("/sessions/{sid}/driver")
async def driver(ws:WebSocket,sid:str):
    await ws.accept()
    s=sessions.get(sid)
    if not s:
        await ws.send_json({"type":"error","message":"GPU session not found"}); await ws.close(code=4404); return
    try:
        while True:
            msg=await ws.receive_json()
            if msg.get("type")=="frame":
                s["frames"]+=1; s["last_frame"]=time.time(); s["status"]="processing"
                await ws.send_json({"type":"frame_ack","sessionId":sid,"frame":s["frames"]})
            elif msg.get("type")=="ping":
                await ws.send_json({"type":"pong","t":msg.get("t")})
            elif msg.get("type")=="stop":
                s["status"]="stopped"; break
    except WebSocketDisconnect:
        s["status"]="disconnected"
    except Exception as exc:
        s["status"]="error"

@app.get("/")
def root():
    return JSONResponse({"service":"LiveSim Lab GPU Worker","status":"ready","renderer":RENDERER})
