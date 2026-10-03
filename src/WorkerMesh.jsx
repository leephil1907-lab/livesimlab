import React,{useEffect,useState} from 'react';
import {Activity,AudioLines,Boxes,CheckCircle2,CircleAlert,RadioTower,RefreshCw,Video} from 'lucide-react';

const FALLBACKS={
 gpu:import.meta.env.VITE_LIVESIM_GPU_WORKER_URL||import.meta.env.VITE_DEEP_LIVE_WORKER_URL||'http://127.0.0.1:8787',
 voice:import.meta.env.VITE_LIVESIM_VOICE_WORKER_URL||'http://127.0.0.1:8790',
 bridge:import.meta.env.VITE_LIVESIM_MEDIA_BRIDGE_HTTP_URL||'http://127.0.0.1:8788',
 obs:import.meta.env.VITE_LIVESIM_OBS_WS_URL||'ws://127.0.0.1:4455'
};

function Node({icon:Icon,label,detail,state,meta}){return <div className={'workerNode '+state}><div className='workerIcon'><Icon size={16}/></div><div className='workerCopy'><b>{label}</b><span>{detail}</span>{meta&&<small>{meta}</small>}</div><i aria-label={state}>{state==='online'||state==='connected'?<CheckCircle2 size={14}/>:state==='checking'?<Activity size={14}/>:<CircleAlert size={14}/>}</i></div>}

export default function WorkerMesh({compact=false}){
 const [nodes,setNodes]=useState({gpu:{state:'checking',detail:'Neural renderer'},voice:{state:'checking',detail:'Authorized voice'},bridge:{state:'checking',detail:'Media bus'},obs:{state:'idle',detail:'OBS control'}});
 const [busy,setBusy]=useState(false);
 const probe=async()=>{
  setBusy(true);
  const http=async(url)=>{try{const r=await fetch(url.replace(/\/$/,'')+'/health',{cache:'no-store'});if(!r.ok)return {state:'offline'};const d=await r.json().catch(()=>({}));return {state:'online',meta:d.renderer||d.model||d.service||'ready'}}catch{return {state:'offline'}}};
  const ws=async(url)=>new Promise(resolve=>{let done=false;const finish=x=>{if(done)return;done=true;resolve(x)};try{const s=new WebSocket(url);const t=setTimeout(()=>{s.close();finish({state:'offline'})},1800);s.onopen=()=>{clearTimeout(t);s.close();finish({state:'connected'})};s.onerror=()=>{clearTimeout(t);finish({state:'offline'})}}catch{finish({state:'offline'})}});
  const [gpu,voice,bridge,obs]=await Promise.all([http(FALLBACKS.gpu),http(FALLBACKS.voice),http(FALLBACKS.bridge),ws(FALLBACKS.obs)]);
  setNodes({gpu:{state:gpu.state,detail:'Neural renderer',meta:gpu.meta},voice:{state:voice.state,detail:'Authorized voice',meta:voice.meta},bridge:{state:bridge.state,detail:'Video + audio media bus',meta:bridge.meta},obs:{state:obs.state,detail:'OBS WebSocket',meta:'localhost control'}});
  setBusy(false);
 };
 useEffect(()=>{probe();const id=setInterval(probe,12000);return()=>clearInterval(id)},[]);
 const items=[
  <Node key='gpu' icon={Boxes} label='GPU WORKER' {...nodes.gpu}/>,
  <Node key='voice' icon={AudioLines} label='VOICE WORKER' {...nodes.voice}/>,
  <Node key='bridge' icon={RadioTower} label='MEDIA BRIDGE' {...nodes.bridge}/>,
  <Node key='obs' icon={Video} label='OBS' {...nodes.obs}/>
 ];
 return <section className={'workerMesh '+(compact?'compact':'')} aria-label='LiveSim worker pipeline'>
   <div className='workerMeshHead'><div><span>WORKER CONTROL PLANE</span><b>Local media workers</b></div><button onClick={probe} disabled={busy} aria-label='Refresh worker status'><RefreshCw size={14}/></button></div>
   <div className='workerFlow'>{items.map((node,i)=><React.Fragment key={i}>{i>0&&<div className={'workerLink '+(nodes[Object.keys(nodes)[i-1]].state==='online'||nodes[Object.keys(nodes)[i-1]].state==='connected'?'active':'')} aria-hidden='true'><span/></div>}{node}</React.Fragment>)}</div>
   {!compact&&<div className='workerHint'><Activity size={13}/> Browser control plane → GPU/voice workers → media bridge → OBS transport. A worker may be offline when its local desktop service is not running.</div>}
 </section>
}
