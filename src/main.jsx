import React,{useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Bell,CircleHelp,LayoutDashboard,Library,Radio,Settings,SlidersHorizontal,Sparkles,Video,Volume2} from 'lucide-react';
import LiveSessionEngine from './LiveSessionEngine.jsx';
import ObsBridge from './ObsBridge.jsx';
import MediaBridgeClient from './MediaBridgeClient.jsx';
import VoiceBridge from './VoiceBridge.jsx';
import PlatformConsole from './PlatformConsole.jsx';
import './live-engine.css';
import './obs-bridge.css';
import './voice-bridge.css';
import './platform-console.css';
import './styles.css';
import './studio-shell.css';

function App(){
 const [section,setSection]=useState('studio');
 const outputCanvasRef=useRef(null);
 const nav=[['studio','Studio',LayoutDashboard],['obs','OBS Bridge',SlidersHorizontal],['calls','Calls',Video],['streams','Live',Radio],['voices','Voices',Volume2],['media','Media Library',Library],['settings','Settings',Settings]];
 return <div className="studioApp"><MediaBridgeClient canvasRef={outputCanvasRef}/>
  <header className="studioTopbar">
   <div className="studioBrand"><div className="studioLogo">LS</div><div><b>LiveSim Lab</b><span>VIRTUAL STUDIO</span></div></div>
   <div className="studioMode"><Sparkles size={14}/> Production workspace</div>
   <div className="studioTopActions"><span className="systemState"><i/> Control plane online</span><button aria-label="Help"><CircleHelp size={17}/></button><button aria-label="Notifications"><Bell size={17}/></button></div>
  </header>
  <div className="studioBody">
   <aside className="studioRail"><div className="railLabel">WORKSPACE</div>{nav.map(([id,label,Icon])=><button key={id} className={section===id?'active':''} onClick={()=>setSection(id)}><Icon size={17}/><span>{label}</span></button>)}<div className="railSpacer"/><div className="railStatus"><i/><span>Session engine<br/><b>Ready</b></span></div></aside>
   <main className="studioMain">{section==='studio'?<LiveSessionEngine outputCanvasRef={outputCanvasRef}/>:section==='obs'?<ObsBridge/>:section==='voices'?<VoiceBridge/>:section==='calls'||section==='streams'?<PlatformConsole onStudio={()=>setSection('studio')}/>:<div className="workspacePlaceholder"><SlidersHorizontal size={24}/><h2>{nav.find(x=>x[0]===section)?.[1]}</h2><p>This workspace is connected to the LiveSim session engine. Open Studio to configure and run a live call or stream.</p><button onClick={()=>setSection('studio')}>Open Studio</button></div>}</main>
  </div>
 </div>
}
createRoot(document.getElementById('root')).render(<App/>);