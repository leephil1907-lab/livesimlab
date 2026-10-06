import React,{useEffect,useState} from 'react';
import {ArrowRight,Camera,Image as ImageIcon,Radio,Settings2,Volume2,CheckCircle2,AlertCircle,RefreshCw} from 'lucide-react';
import LiveSessionEngine from './LiveSessionEngine.jsx';

const steps=[
  {id:'source',title:'Source',desc:'Camera, screen or media',icon:Camera},
  {id:'avatar',title:'Avatar',desc:'Face and voice setup',icon:ImageIcon},
  {id:'destination',title:'Destination',desc:'Where the session goes',icon:Radio},
  {id:'start',title:'Start session',desc:'Run preflight and launch',icon:ArrowRight}
];

export default function StudioWorkspace(){
  const [active,setActive]=useState('source');
  const [health,setHealth]=useState(null);
  const [checking,setChecking]=useState(false);

  const checkHealth=async()=>{
    setChecking(true);
    try{
      const r=await fetch('/api/health',{cache:'no-store'});
      const d=await r.json();
      setHealth(d);
    }catch{
      setHealth(null);
    }finally{
      setChecking(false);
    }
  };

  useEffect(()=>{checkHealth();},[]);

  const go=id=>{
    setActive(id);
    if(id==='destination') document.querySelector('.platformGrid button')?.focus();
    if(id==='start') document.querySelector('.transportBar .primary')?.focus();
  };

  const gpuConfigured=Boolean(health?.transport?.gpuWorker);
  const voiceConfigured=Boolean(health?.transport?.voiceWorker);
  const gatewayConfigured=Boolean(health?.transport?.mediaGateway);

  return <section className="studioWorkspace">
    <div className="studioIntro">
      <div>
        <span>LIVE SIM STUDIO</span>
        <h1>Create a live session.</h1>
        <p>Choose a source, configure your avatar, select one destination, then start.</p>
      </div>
      <div className="studioHealth">
        <i className={gpuConfigured?'ready':''}/>
        <span>{gpuConfigured?'GPU CONFIGURED':'GPU WORKER NOT CONFIGURED'}</span>
        <small>{gpuConfigured?'Reachability is checked when a session starts.':'Browser preview remains available. Add the worker later in Settings.'}</small>
      </div>
    </div>

    <nav className="studioFlow" aria-label="Session setup">
      {steps.map(({id,title,desc,icon:Icon},i)=><React.Fragment key={id}>
        <button className={active===id?'active':''} onClick={()=>go(id)}>
          <span className="flowIcon"><Icon size={16}/></span>
          <span><b>{title}</b><small>{desc}</small></span>
          {i<3&&<ArrowRight className="flowArrow" size={14}/>}
        </button>
      </React.Fragment>)}
    </nav>

    <div className="studioPreflight" aria-label="Advanced readiness summary">
      <span><CheckCircle2 size={14}/> Browser studio ready</span>
      <span><CheckCircle2 size={14}/> Local preview available</span>
      <span className={gpuConfigured?'ready':'blocked'}>{gpuConfigured?<CheckCircle2 size={14}/>:<AlertCircle size={14}/>} GPU {gpuConfigured?'configured':'not configured'}</span>
      <span className={voiceConfigured?'ready':'blocked'}>{voiceConfigured?<CheckCircle2 size={14}/>:<AlertCircle size={14}/>} Voice {voiceConfigured?'configured':'not configured'}</span>
      <span className={gatewayConfigured?'ready':'blocked'}>{gatewayConfigured?<CheckCircle2 size={14}/>:<AlertCircle size={14}/>} Gateway {gatewayConfigured?'configured':'not configured'}</span>
      <button onClick={checkHealth} disabled={checking}><RefreshCw size={14}/> {checking?'Checking…':'Refresh'}</button>
      <button onClick={()=>setActive('start')}><Settings2 size={14}/> Preflight</button>
    </div>

    <LiveSessionEngine/>
  </section>;
}
