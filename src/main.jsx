import React from 'react';
import {createRoot} from 'react-dom/client';
import LiveSessionEngine from './LiveSessionEngine.jsx';
import './live-engine.css';
import './styles.css';

function App(){
 return <div className="shell">
  <header className="top">
   <div className="brand"><div className="mark">LS</div><div><b>LiveSim Lab</b><small>MEDIA SESSION ENGINE</small></div></div>
   <div className="safety"><span/> REAL TRANSPORT STATUS <i/> NO SIMULATED CONNECTIONS</div>
  </header>
  <main><LiveSessionEngine/></main>
  <footer style={{maxWidth:1440,margin:'0 auto',padding:'0 28px 48px',color:'#68736b',fontSize:11}}>LiveSim Lab · DeepFaceLive-inspired modular media pipeline · Vercel hosts the control plane; GPU inference and persistent media transport run through configured external workers.</footer>
 </div>
}

createRoot(document.getElementById('root')).render(<App/>);
