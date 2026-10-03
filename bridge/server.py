"""Local LiveSim media bridge for OBS Browser Source."""
import asyncio, os, time
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse

HOST=os.getenv("LIVESIM_BRIDGE_HOST","127.0.0.1")
PORT=int(os.getenv("LIVESIM_BRIDGE_PORT","8788"))
MAX_FRAME_BYTES=int(os.getenv("LIVESIM_BRIDGE_MAX_FRAME_BYTES",str(900_000)))
MAX_FPS=float(os.getenv("LIVESIM_BRIDGE_MAX_FPS","30"))
app=FastAPI(title="LiveSim Desktop Media Bridge")
viewers=set(); audio_viewers=set(); last_frame=None; last_frame_at=0.0; last_publish_at=0.0; frame_count=0

OBS_HTML="""<!doctype html><html><head><meta charset="utf-8"><title>LiveSim OBS Output</title>
<style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#000}canvas{width:100%;height:100%;display:block;object-fit:contain}</style>
</head><body><canvas id="c" width="1280" height="720"></canvas><script>
const c=document.getElementById("c"),x=c.getContext("2d"),img=new Image();
let ws;let audioQueue=Promise.resolve();const audioCtx=new (window.AudioContext||window.webkitAudioContext)();
function connect(){
 ws=new WebSocket((location.protocol==="https:"?"wss":"ws")+"://"+location.host+"/ws/view");ws.binaryType="blob";
 ws.onmessage=e=>{if(typeof e.data==="string")return;const u=URL.createObjectURL(e.data);img.onload=()=>{x.drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(u)};img.src=u};
 ws.onclose=()=>setTimeout(connect,500);
 const aw=new WebSocket((location.protocol==="https:"?"wss":"ws")+"://"+location.host+"/ws/audio/view");aw.binaryType="arraybuffer";
 aw.onmessage=e=>{audioQueue=audioQueue.then(async()=>{try{await audioCtx.resume();const b=await audioCtx.decodeAudioData(e.data.slice(0));const s=audioCtx.createBufferSource();s.buffer=b;s.connect(audioCtx.destination);s.start()}catch(_){}})};
} connect();</script></body></html>"""

@app.get("/health")
def health(): return {"ok":True,"service":"livesim-desktop-media-bridge","viewers":len(viewers),"audioViewers":len(audio_viewers),"frames":frame_count,"lastFrameAt":last_frame_at}

@app.get("/capabilities")
def capabilities(): return {"publish":"/ws/publish","audioPublish":"/ws/audio/publish","obsSource":f"http://127.0.0.1:{PORT}/obs","video":"jpeg-websocket","audio":"wav-websocket","maxFps":MAX_FPS}

@app.get("/obs",response_class=HTMLResponse)
def obs(): return HTMLResponse(OBS_HTML)

@app.websocket("/ws/publish")
async def publish(ws:WebSocket):
 global last_frame,last_frame_at,last_publish_at,frame_count
 await ws.accept()
 try:
  while True:
   data=await ws.receive_bytes();now=time.monotonic()
   if len(data)>MAX_FRAME_BYTES: await ws.close(code=1009,reason="frame too large");return
   if now-last_publish_at<1.0/max(1.0,MAX_FPS): continue
   last_publish_at=now;last_frame=data;last_frame_at=time.time();frame_count+=1
   for viewer in list(viewers):
    try: await viewer.send_bytes(data)
    except Exception: viewers.discard(viewer)
 except WebSocketDisconnect: pass

@app.websocket("/ws/audio/publish")
async def audio_publish(ws:WebSocket):
 await ws.accept()
 try:
  while True:
   data=await ws.receive_bytes()
   if len(data)>10*1024*1024: await ws.close(code=1009,reason="audio too large");return
   for viewer in list(audio_viewers):
    try: await viewer.send_bytes(data)
    except Exception: audio_viewers.discard(viewer)
 except WebSocketDisconnect: pass

@app.websocket("/ws/audio/view")
async def audio_view(ws:WebSocket):
 await ws.accept();audio_viewers.add(ws)
 try:
  while True: await ws.receive_text()
 except Exception: audio_viewers.discard(ws)

@app.websocket("/ws/view")
async def view(ws:WebSocket):
 await ws.accept();viewers.add(ws)
 try:
  if last_frame: await ws.send_bytes(last_frame)
  while True: await ws.receive_text()
 except Exception: viewers.discard(ws)

if __name__=="__main__":
 import uvicorn
 uvicorn.run(app,host=HOST,port=PORT)