import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {CircleHelp,LayoutDashboard,RadioTower,Settings,Volume2,Wifi,ArrowLeft} from 'lucide-react';
import StudioWorkspace from './StudioWorkspace.jsx';
import PlatformConsole from './PlatformConsole.jsx';
import VoiceBridge from './VoiceBridge.jsx';
import './live-engine.css';
import './voice-bridge.css';
import './platform-console.css';
import './styles.css';
import './studio-shell.css';
import './product-shell.css';

const routes=[
  ['/studio','Studio',LayoutDashboard],
  ['/destinations','Destinations',Wifi],
  ['/voices','Voices',Volume2],
  ['/settings','Settings',Settings]
];

function SettingsPanel(){
  const [health,setHealth]=useState(null),[busy,setBusy]=useState(false);
  const check=async()=>{setBusy(true);try{const r=await fetch('/api/health',{cache:'no-store'});setHealth(await r.json());}catch(e){setHealth({ok:false,blockers:[e.message||'Control-plane health check failed.']});}finally{setBusy(false);}};
  useEffect(()=>{check();},[]);
  return <section className="productSettings"><header><div><span>SETTINGS</span><h2>LiveSim configuration</h2><p>Advanced transport, worker and connection diagnostics live here.</p></div><button onClick={check} disabled={busy}><Wifi size={15}/>{busy?'Checking…':'Check health'}</button></header><div className="settingsGrid"><article><span>CONTROL PLANE</span><b className={health?.ok?'ready':'warn'}>{health?.ok?'READY':'NEEDS CONFIGURATION'}</b><p>Sessions, secure cookies and API configuration.</p></article><article><span>REAL-TIME WORKERS</span><b className={health?.transport?.gpuWorker?'ready':'warn'}>{health?.transport?.gpuWorker?'CONFIGURED':'NOT CONFIGURED'}</b><p>GPU, voice, signaling, media gateway and WHIP endpoints.</p></article><article><span>DESTINATIONS</span><b>CONNECTIONS</b><p>Manage platform authorization and output configuration.</p></article><article><span>ADVANCED</span><b>LOCAL-FIRST</b><p>The GPU worker can remain on your workstation and connect securely when available.</p></article></div>{health?.blockers?.length>0&&<div className="settingsBlockers"><strong>Configuration required</strong>{health.blockers.map((x,i)=><p key={i}>• {x}</p>)}</div>}</section>;
}

function getPath(){const p=window.location.pathname.replace(/\/+$/,'')||'/studio';return routes.some(r=>r[0]===p)?p:'/studio';}

function App(){
  const [path,setPath]=useState(getPath);
  useEffect(()=>{const onPop=()=>setPath(getPath());window.addEventListener('popstate',onPop);return()=>window.removeEventListener('popstate',onPop);},[]);
  const navigate=(to,e)=>{e?.preventDefault();if(to===path)return;window.history.pushState({},'',to);setPath(to);window.scrollTo({top:0,behavior:'instant'});};
  const active=routes.find(r=>r[0]===path)||routes[0];
  const Page=path==='/studio'?<StudioWorkspace/>:path==='/destinations'?<PlatformConsole onStudio={()=>navigate('/studio')}/>:path==='/voices'?<VoiceBridge/>:<SettingsPanel/>;
  return <div className="productApp">
    <header className="productTopbar">
      <a href="/studio" onClick={e=>navigate('/studio',e)} className="productBrand" aria-label="LiveSim Lab Studio"><div className="productLogo"><RadioTower size={19}/></div><div><b>LiveSim Lab</b><span>REAL-TIME MEDIA STUDIO</span></div></a>
      <div className="productStep"><span>WORKSPACE</span><b>{active[1]}</b></div>
      <a className="productHelp" href="/settings" onClick={e=>navigate('/settings',e)} aria-label="Settings"><CircleHelp size={17}/></a>
    </header>
    <div className="productLayout">
      <aside className="productNav" aria-label="Main navigation">
        {routes.map(([href,label,Icon])=><a key={href} href={href} className={path===href?'active':''} onClick={e=>navigate(href,e)}><Icon size={17}/><span>{label}</span></a>)}
      </aside>
      <main className="productMain">
        <div className="pageBack"><a href={path==='/studio'?'/studio':'/studio'} onClick={e=>navigate('/studio',e)}><ArrowLeft size={14}/> Studio</a></div>
        {Page}
      </main>
    </div>
  </div>;
}
createRoot(document.getElementById('root')).render(<App/>);
