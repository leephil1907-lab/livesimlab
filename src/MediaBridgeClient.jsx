import {useEffect,useRef,useState} from 'react';

export default function MediaBridgeClient({canvasRef}){
 const [status,setStatus]=useState('offline');
 const [frames,setFrames]=useState(0);
 const ws=useRef(null),timer=useRef(null),last=useRef(0);
 const url=import.meta.env.VITE_LIVESIM_MEDIA_BRIDGE_URL||'ws://127.0.0.1:8788/ws/publish';
 useEffect(()=>{
  let stopped=false;
  const connect=()=>{
   if(stopped)return; setStatus('connecting');
   try{const s=new WebSocket(url);ws.current=s;s.binaryType='arraybuffer';
    s.onopen=()=>setStatus('connected');s.onerror=()=>setStatus('error');
    s.onclose=()=>{setStatus('offline');if(!stopped)timer.current=setTimeout(connect,2500)};
   }catch{setStatus('error');timer.current=setTimeout(connect,2500)}
  };
  const publish=()=>{
   const canvas=canvasRef?.current,s=ws.current;
   if(canvas&&s?.readyState===1){const now=performance.now();
    if(now-last.current>32){last.current=now;canvas.toBlob(blob=>{
      if(blob&&ws.current?.readyState===1){ws.current.send(blob);setFrames(n=>n+1)}
    },'image/jpeg',.78)}}
   requestAnimationFrame(publish);
  };
  connect();const raf=requestAnimationFrame(publish);
  return()=>{stopped=true;cancelAnimationFrame(raf);if(timer.current)clearTimeout(timer.current);ws.current?.close()};
 },[url]);
 return <span className='mediaBridgeStatus' title='Local OBS bridge'><i className={status==='connected'?'good':''}/>{status==='connected'?'OBS bridge '+frames+'f':'OBS bridge '+status}</span>;
}