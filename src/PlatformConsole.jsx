import React,{useEffect,useState} from 'react';
import {ExternalLink,RefreshCw,ShieldCheck,Video,Radio,Phone,Wifi,AlertTriangle} from 'lucide-react';

export default function PlatformConsole({onStudio}){
 const [data,setData]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[selected,setSelected]=useState('');
 const load=async()=>{setBusy(true);try{const r=await fetch('/api/live');const d=await r.json();if(!r.ok)throw new Error(d.error||'Unable to load capabilities');setData(d);setError('')}catch(e){setError(e.message)}finally{setBusy(false)}};
 useEffect(()=>{load()},[]);
 const icon=k=>k==='meeting'?Video:k==='calling'?Phone:k==='stream'?Wifi:Radio;
 return <section className='platformConsole'><header><div><span>LIVE CONTROL CONSOLE</span><h2>Destination routing</h2><p>One processed LiveSim media bus, with explicit video, background, voice and platform transports.</p></div><button onClick={load} disabled={busy}><RefreshCw size={15}/> Refresh</button></header>
 {busy&&!data&&<div className='consoleLoading' aria-busy='true' aria-label='Loading platform diagnostics'><span/><span/><span/></div>}
 <div className='pipelineStrip'>{Object.entries(data?.pipeline||{}).map(([k,v])=><div key={k}><i className={v===false?'bad':'good'}/><span>{k}</span><b>{typeof v==='string'?v:v?'READY':'OFF'}</b></div>)}</div>
 {error&&<div className='consoleError'><AlertTriangle size={15}/>{error}</div>}
 <div className='platformCards' role='list' aria-label='Available destinations'>{Object.entries(data?.platforms||{}).map(([id,p])=>{const I=icon(p.kind);const active=selected===id;return <article key={id} role='listitem' className={active?'selected':''}><div className='platformCardHead'><I size={18}/><div><b>{p.name}</b><small>{p.kind}</small></div><span className={p.directMedia?'direct':'bridge'}>{p.directMedia?'DIRECT':'BRIDGE'}</span></div><p>{p.requirements}</p><code>{p.transport}</code><button className='destinationSelect' aria-pressed={active} onClick={()=>setSelected(id)}><I size={14}/> {active?'Selected destination':'Select destination'}</button>{active&&<button onClick={()=>onStudio?.(id)}><ExternalLink size={14}/> Use this in Studio</button>}</article>})}</div>
 {data&&!selected&&<div className='consoleEmpty'><b>Choose one destination to continue.</b><span>LiveSim routes a session to the selected platform only. You can change the destination before starting another session.</span></div>}
 <div className='consoleNote'><ShieldCheck size={16}/><span>Platform adapters never claim direct media injection where the provider does not expose it. Zoom native Production Studio requires the desktop SDK; Meet/WhatsApp/Telegram use the OS/browser media route. Live voice conversion is separate from F5-TTS and requires the local GPU converter endpoint.</span></div>
 </section>
}