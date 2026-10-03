import React,{useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Bell,CircleHelp,LayoutDashboard,Library,Radio,RadioTower,Settings,SlidersHorizontal,Sparkles,Video,Volume2} from 'lucide-react';
import LiveSessionEngine from './LiveSessionEngine.jsx';
import ObsBridge from './ObsBridge.jsx';
import MediaBridgeClient from './MediaBridgeClient.jsx';
import VoiceBridge from './VoiceBridge.jsx';
import PlatformConsole from './PlatformConsole.jsx';
import WorkerMesh from './WorkerMesh.jsx';
import WorkerConsole from './WorkerConsole.jsx';
import './live-engine.css';
import './obs-bridge.css';
import './voice-bridge.css';
import './platform-console.css';
import './styles.css';
import './studio-shell.css';
import './worker-mesh.css';

function App(){
 const [section,setSection]=useState('studio');
 const [pendingDestination,setPendingDestination]=useState('');
 const [toast,setToast]=useState('');
 const outputCanvasRef=useRef(null);
 const railRefs=useRef([]);
 const nav=[['studio','Studio',LayoutDashboard],['obs','OBS Bridge',SlidersHorizontal],['calls','Calls',Video],['streams','Live',Radio],['voices','Voices',Volume2],['media','Media Library',Library],['settings','Settings',Settings]];
 const announce=(message)=>{setToast(message);window.clearTimeout(announce.timer);announce.timer=window.setTimeout(()=>setToast(''),2600)};
 const moveRail=(index,delta)=>{const next=(index+delta+nav.length)%nav.length;railRefs.current[next]?.focus();setSection(nav[next][0]);announce(nav[next][1]+' workspace');};
 return <div className="studioApp"><MediaBridgeClient canvasRef={outputCanvasRef}/><div className="a11yLive" role="status" aria-live="polite" aria-atomic="true">{toast}</div>
  <header className="studioTopbar">
   <div className="studioBrand"><div className="studioLogo" aria-hidden="true"><RadioTower size={20}/></div><div><b>LiveSim Lab</b><span>VIRTUAL STUDIO</span></div></div>
   <div className="studioMode"><Sparkles size={14}/> Production workspace</div>
   <div className="studioTopActions"><span className="systemState"><i/> Control plane online</span><button aria-label="Help"><CircleHelp size={17}/></button><button aria-label="Notifications"><Bell size={17}/></button></div>
  </header>
  <div className="studioBody">
   <aside className="studioRail" aria-label="Workspace navigation"><div className="railLabel">WORKSPACE</div>{nav.map(([id,label,Icon],index)=><button ref={el=>railRefs.current[index]=el} key={id} className={section===id?'active':''} aria-current={section===id?'page':undefined} onClick={()=>{setSection(id);announce(label+' workspace')}} onKeyDown={e=>{if(e.key==='ArrowDown'||e.key==='ArrowRight'){e.preventDefault();moveRail(index,1)}else if(e.key==='ArrowUp'||e.key==='ArrowLeft'){e.preventDefault();moveRail(index,-1)}else if(e.key==='Home'){e.preventDefault();railRefs.current[0]?.focus();setSection(nav[0][0])}else if(e.key==='End'){e.preventDefault();railRefs.current[nav.length-1]?.focus();setSection(nav[nav.length-1][0])}}}><Icon size={17}/><span>{label}</span></button>)}<div className="railSpacer"/><div className="railStatus"><i/><span>Session engine<br/><b>Ready</b></span></div></aside>
   <main className="studioMain">{section==='studio'?<><WorkerConsole/><LiveSessionEngine outputCanvasRef={outputCanvasRef} initialDestination={pendingDestination}/></>:section==='obs'?<ObsBridge/>:section==='voices'?<VoiceBridge/>:section==='calls'||section==='streams'?<PlatformConsole onStudio={id=>{setPendingDestination(id);setSection('studio');announce('Studio routed to '+id)}}/>:<div className="workspacePlaceholder"><SlidersHorizontal size={24}/><h2>{nav.find(x=>x[0]===section)?.[1]}</h2><p>This workspace is connected to the LiveSim session engine. Open Studio to configure and run a live call or stream.</p><button onClick={()=>setSection('studio')}>Open Studio</button></div>}</main>
  </div>
 </div>
}
createRoot(document.getElementById('root')).render(<App/>);