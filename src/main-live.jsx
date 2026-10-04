import React,{useEffect,useState} from 'react';
import {ArrowUpRight,ChevronRight,Command,Headphones,Mic,Radio,ShieldCheck,Volume2,Zap} from 'lucide-react';
import {createRoot} from 'react-dom/client';
import DeepLiveCamLab from './DeepLiveCamLab.jsx';
import DroidCamStudioGuide from './DroidCamStudioGuide.jsx';
import './styles.css';
import './live-lab.css';

const destinations=[['WhatsApp','Account connection'],['Google Meet','Account connection'],['Zoom','Account connection'],['Telegram','Account connection'],['TikTok LIVE','Account connection'],['Custom RTMP / WebRTC','Endpoint']];
function App(){
 const [boot,setBoot]=useState(true),[tab,setTab]=useState('session'),[destination,setDestination]=useState('');
 useEffect(()=>{const t=setTimeout(()=>setBoot(false),900);return()=>clearTimeout(t)},[]);
 const go=id=>{setTab(id);document.getElementById(id)?.scrollIntoView({behavior:'smooth',block:'start'})};
 return <div className="shell">
  {boot&&<div className="curtain"><div className="counter">00<span>%</span></div><div className="bootline"><span>LIVE SIM LAB</span><span>LOADING PROCESSING CONSOLE</span></div><div className="progress"><i/></div></div>}
  <header className="top"><button className="brand brandButton" onClick={()=>go('session')}><div className="mark">LS</div><div><b>LiveSim Lab</b><small>MEDIA SIMULATION CONSOLE</small></div></button><div className="safety"><span/> SIMULATION MODE <i/> SYNTHETIC MEDIA LAB</div><div className="topActions"><button className="iconBtn" onClick={()=>go('deep-live')}><Command size={15}/> Processing Lab</button></div></header>
  <main>
   <section className="hero reveal visible" id="session"><div className="ambient ambientOne"/><div className="ambient ambientTwo"/><div className="heroCopy"><p className="kicker">SAFE MEDIA RESEARCH / 01</p><h1>One workspace for <em>voice, video and live media.</em></h1><p>Connect authorized media, voice profiles and destinations while keeping the synthetic-media processing boundary explicit.</p><div className="heroActions"><button className="start" onClick={()=>go('deep-live')}><Zap size={15}/> Open processing lab</button><button className="iconBtn" onClick={()=>go('connect')}>Connect destination <ArrowUpRight size={14}/></button></div></div><div className="heroCard"><span>PIPELINE</span><div className="pipeline"><b>MEDIA</b><ChevronRight/><b>VOICE</b><ChevronRight/><b>FACE / VIDEO</b><ChevronRight/><b>DESTINATION</b></div><small>Every stage requires explicit user input or authorization. No demo identity is inserted.</small></div></section>
   <nav className="nav">{[['session','01 Session'],['deep-live','02 Face / Video'],['camera','03 Camera Bridge'],['voice','04 Voice'],['connect','05 Connect'],['review','06 Review']].map(([id,label])=><button className={tab===id?'on':''} onClick={()=>go(id)} key={id}>{label}</button>)}</nav>
   <section id="deep-live"><DeepLiveCamLab/></section>
   <section id="camera"><DroidCamStudioGuide/></section>
   <section className="studioGrid reveal visible" id="voice"><div className="panel"><div className="panelTop"><div><p className="kicker">AUTHORIZED VOICE</p><h2>Voice routing</h2></div><Volume2 size={18}/></div><p className="voiceExplain">The voice layer remains provider-backed. Enter or select an authorized profile from the connected voice service; LiveSim Lab does not ship a fake voice identity.</p><div className="voiceRow"><Headphones/><div><b>Voice profile</b><small>Provider profile required</small></div><button onClick={()=>go('review')}>Configure</button></div><div className="voiceRow"><Mic/><div><b>Microphone</b><small>Browser permission + local level meter</small></div><button onClick={()=>go('deep-live')}>Open</button></div></div>
   <div className="panel" id="connect"><div className="panelTop"><div><p className="kicker">AUTHORIZED DESTINATIONS</p><h2>Connect a platform</h2></div><Radio size={18}/></div><div className="platformList">{destinations.map(([n,k])=><button className={destination===n?'selected':''} onClick={()=>setDestination(n)} key={n}><div><b>{n}</b><small>{k}</small></div><ArrowUpRight size={14}/></button>)}</div><small className="note">OAuth/account connection is required before any real platform workflow is started. Unsupported providers are not represented as connected.</small></div></section>
   <section className="review panel reveal visible" id="review"><div className="panelTop"><div><p className="kicker">FINAL GATE / 06</p><h2>Session review</h2></div><ShieldCheck size={19}/></div><div className="reviewGrid"><div><span>MEDIA ENGINE</span><b>Deep-Live-Cam integration</b><small>Source face → target media → configured processor</small></div><div><span>DESTINATION</span><b>{destination||'Not selected'}</b><small>Explicit account authorization required</small></div><div><span>STATUS</span><b>SIMULATION BOUNDARY VISIBLE</b><small>No synthetic output is fabricated when the processing worker is unavailable.</small></div></div></section>
  </main>
  <footer className="footer"><span>LiveSim Lab / Research Console</span><span>Deep-Live-Cam integration · synthetic media clearly marked</span></footer>
 </div>
}
createRoot(document.getElementById('root')).render(<App/>);
