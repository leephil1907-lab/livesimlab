import React,{useEffect,useState} from 'react';
import {ExternalLink,RefreshCw,ShieldCheck,Video,Radio,Phone,Wifi,AlertTriangle} from 'lucide-react';

export default function PlatformConsole({onStudio}){
 const [data,setData]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const load=async()=>{setBusy(true);try{const r=await fetch('/api/live');const d=await r.json();if(!r.ok)throw new Error(d.error||'Unable to load capabilities');setData(d);setError('')}catch(e){setError(e.message)}finally{setBusy(false)}};
 useEffect(()=>{load()},[]);
 const icon=k=>k==='meeting'?Video:k==='calling'?Phone:k==='stream'?Wifi:Radio;
 return <section className='platformConsole'><header><div><span>LIVE CONTROL CONSOLE</span><h2>Destination routing</h2><p>One processed LiveSim output, with an explicit transport for every supported platform.</p></div><button onClick={load} disabled={busy}><RefreshCw size={15}/> Refresh</button></header>
 <div className='pipelineStrip'>{Object.entries(data?.pipeline||{}).map(([k,v])=><div key={k}><i className={v===false?'bad':'good'}/><span>{k}</span><b>{typeof v==='string'?v:v?'READY':'OFF'}</b></div>)}</div>
 {error&&<div className='consoleError'><AlertTriangle size={15}/>{error}</div>}
 <div className='platformCards'>{Object.entries(data?.platforms||{}).map(([id,p])=>{const I=icon(p.kind);return <article key={id}><div className='platformCardHead'><I size={18}/><div><b>{p.name}</b><small>{p.kind}</small></div><span className={p.directMedia?'direct':'bridge'}>{p.directMedia?'DIRECT':'BRIDGE'}</span></div><p>{p.requirements}</p><code>{p.transport}</code><button onClick={onStudio}><ExternalLink size={14}/> Open Studio routing</button></article>})}</div>
 <div className='consoleNote'><ShieldCheck size={16}/><span>Platform adapters never claim direct media injection where the provider does not expose it. Zoom native Production Studio requires the desktop SDK; Meet/WhatsApp/Telegram use the OS/browser media route.</span></div>
 </section>
}