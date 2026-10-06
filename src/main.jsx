import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {CircleHelp,LayoutDashboard,RadioTower,Settings,Volume2,Wifi} from 'lucide-react';
import LiveSessionEngine from './LiveSessionEngine.jsx';
import StudioWorkspace from './StudioWorkspace.jsx';
import PlatformConsole from './PlatformConsole.jsx';
import VoiceBridge from './VoiceBridge.jsx';
import './live-engine.css';
import './voice-bridge.css';
import './platform-console.css';
import './styles.css';
import './studio-shell.css';
import './product-shell.css';

function SettingsPanel(){
  const [health,setHealth]=useState(null);
  const [busy,setBusy]=useState(false);
  const check=async()=>{
    setBusy(true);
    try{
      const r=await fetch('/api/health',{cache:'no-store'});
      const d=await r.json();
      setHealth(d);
    }catch(e){
      setHealth({ok:false,blockers:[e.message||'Control-plane health check failed.']});
    }finally{setBusy(false);}
  };
  useEffect(()=>{check();},[]);
  return <section className="productSettings">
    <header><div><span>SETTINGS</span><h2>LiveSim configuration</h2><p>Keep the normal studio simple. Advanced transport and worker diagnostics live here.</p></div><button onClick={check} disabled={busy}><Wifi size={15}/>{busy?'Checking…':'Check health'}</button></header>
    <div className="settingsGrid">
      <article><span>CONTROL PLANE</span><b className={health?.ok?'ready':'warn'}>{health?.ok?'READY':'NEEDS CONFIGURATION'}</b><p>Vercel API routes, secure session cookies and OAuth configuration.</p></article>
      <article><span>REAL-TIME WORKERS</span><b className={health?.transport?.gpuWorker?'ready':'warn'}>{health?.transport?.gpuWorker?'CONFIGURED':'NOT CONFIGURED'}</b><p>GPU, voice, signaling, media gateway and WHIP endpoints are configured server-side.</p></article>
      <article><span>DESTINATIONS</span><b>GOOGLE · ZOOM · TIKTOK</b><p>OAuth credentials are required before an account can be connected.</p></article>
      <article><span>ADVANCED</span><b>LOCAL-FIRST</b><p>The RTX/GPU worker can remain on the workstation. Do not expose localhost URLs as public server endpoints.</p></article>
    </div>
    {health?.blockers?.length>0&&<div className="settingsBlockers"><strong>What still needs configuration</strong>{health.blockers.map((x,i)=><p key={i}>• {x}</p>)}</div>}
  </section>;
}

function App(){
  const [section,setSection]=useState('studio');
  const nav=[
    ['studio','Studio',LayoutDashboard],
    ['destinations','Destinations',Wifi],
    ['voices','Voices',Volume2],
    ['settings','Settings',Settings]
  ];
  const active=nav.find(item=>item[0]===section)||nav[0];
  return <div className="productApp">
    <header className="productTopbar">
      <div className="productBrand"><div className="productLogo"><RadioTower size={19}/></div><div><b>LiveSim Lab</b><span>REAL-TIME MEDIA STUDIO</span></div></div>
      <div className="productStep"><span>WORKSPACE</span><b>{active[1]}</b></div>
      <button className="productHelp" aria-label="Help"><CircleHelp size={17}/></button>
    </header>
    <div className="productLayout">
      <aside className="productNav" aria-label="Main navigation">
        {nav.map(([id,label,Icon])=><button key={id} className={section===id?'active':''} onClick={()=>setSection(id)}><Icon size={17}/><span>{label}</span></button>)}
      </aside>
      <main className="productMain">
        {section==='studio'&&<StudioWorkspace/>}
        {section==='destinations'&&<PlatformConsole onStudio={()=>setSection('studio')}/>}
        {section==='voices'&&<VoiceBridge/>}
        {section==='settings'&&<SettingsPanel/>}
      </main>
    </div>
  </div>;
}

createRoot(document.getElementById('root')).render(<App/>);
