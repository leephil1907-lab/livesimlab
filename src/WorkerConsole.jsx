import React,{useCallback,useEffect,useState} from 'react';
import {Activity,CheckCircle2,Cpu,Mic2,RadioTower,RefreshCw,Server,Wifi,WifiOff} from 'lucide-react';

const configs=[
 {id:'gpu',label:'Neural GPU',kind:'HTTP',icon:Cpu,url:()=>import.meta.env.VITE_LIVESIM_GPU_WORKER_URL||'',health:'/health',detail:'Deep-Live-Cam / CUDA renderer'},
 {id:'voice',label:'Voice worker',kind:'HTTP',icon:Mic2,url:()=>import.meta.env.VITE_LIVESIM_VOICE_WORKER_URL||'',health:'/health',detail:'Authorized F5-TTS worker'},
 {id:'converter',label:'Live voice',kind:'HTTP',icon:Activity,url:()=>import.meta.env.VITE_LIVESIM_VOICE_CONVERTER_URL?.replace(/^ws/,'http')||'',health:'/health',detail:'Low-latency voice conversion'},
 {id:'media',label:'Media bridge',kind:'HTTP',icon:RadioTower,url:()=>import.meta.env.VITE_LIVESIM_OBS_SOURCE_URL?.replace(/\/obs\/?$/,'')||'http://127.0.0.1:8788',health:'/health',detail:'Video/audio bridge to OBS'}
];

function normalize(base,path){return base?base.replace(/\/$/,'')+path:''}

export default function WorkerConsole(){
 const [states,setStates]=useState(()=>Object.fromEntries(configs.map(x=>[x.id,{state:'checking'}])));
 const [busy,setBusy]=useState(false);
 const probe=useCallback(async()=>{
  setBusy(true);
  const next={};
  await Promise.all(configs.map(async c=>{
   const base=c.url();
   if(!base){next[c.id]={state:'unconfigured'};return}
   const started=performance.now();
   const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),3500);
   try{const r=await fetch(normalize(base,c.health),{cache:'no-store',signal:controller.signal});const body=await r.json().catch(()=>({}));next[c.id]={state:r.ok?'online':'error',latency:Math.round(performance.now()-started),body};}
   catch(e){next[c.id]={state:'offline',error:e.name==='AbortError'?'Timed out':e.message};}
   finally{clearTimeout(timer)}
  }));
  setStates(next);setBusy(false);
 },[]);
 useEffect(()=>{probe();const t=setInterval(probe,10000);return()=>clearInterval(t)},[probe]);
 const online=Object.values(states).filter(x=>x.state==='online').length;
 return <section className="workerConsole" aria-labelledby="worker-title">
  <div className="workerHeader"><div><span>RUNTIME FABRIC</span><h2 id="worker-title">Workers & bridges</h2><p>Every media stage reports its real connection state. Nothing is shown as ready just because an endpoint is configured.</p></div><button onClick={probe} disabled={busy}><RefreshCw size={14} className={busy?'spin':''}/> {busy?'Checking…':'Refresh'}</button></div>
  <div className="workerSummary"><Server size={15}/><b>{online}/{configs.length} services online</b><span>auto-checking every 10s</span></div>
  <div className="workerGrid">{configs.map(c=>{const s=states[c.id]||{state:'checking'};const I=c.icon;return <article key={c.id} className={'workerCard '+s.state} aria-busy={s.state==='checking'}>
   <div className="workerCardTop"><div className="workerIcon"><I size={17}/></div><div><b>{c.label}</b><small>{c.kind} · {c.detail}</small></div><span className="workerDot" aria-label={s.state}/></div>
   <div className="workerMeta"><code>{c.url()||'Endpoint not configured'}</code>{s.latency&&<span>{s.latency}ms</span>}</div>
   <div className="workerState">{s.state==='online'?<><CheckCircle2 size={14}/> Connected</>:s.state==='checking'?<><Activity size={14}/> Checking worker…</>:s.state==='unconfigured'?<><WifiOff size={14}/> Not configured</>:<><WifiOff size={14}/> Offline</>}</div>
  </article>})}</div>
 </section>
}