import React,{useEffect,useState} from 'react';
import {ArrowRight,Camera,Image as ImageIcon,Radio,Settings2,Volume2,CheckCircle2,AlertCircle} from 'lucide-react';
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
  useEffect(()=>{fetch('/api/health',{cache:'no-store'}).then(r=>r.json()).then(setHealth).catch(()=>{});},[]);
  const go=id=>{
    setActive(id);
    const selectors={
      source:'.assetCard.camera,.sourceItem',
      avatar:'.assetCard.avatar',
      destination:'.platformGrid button',
      start:'.transportBar .primary'
    };
    if(id==='avatar') document.querySelector('.assetCard.avatar')?.click();
    else if(id==='destination') document.querySelector('.platformGrid button')?.focus();
    else if(id==='start') document.querySelector('.transportBar .primary')?.focus();
  };
  const worker=Boolean(health?.transport?.gpuWorker);
  return <section className="studioWorkspace">
    <div className="studioIntro">
      <div><span>LIVE SIM STUDIO</span><h1>Create a live session.</h1><p>Choose a source, configure your avatar, select one destination, then start.</p></div>
      <div className="studioHealth"><i className={worker?'ready':''}/><span>{worker?'GPU WORKER CONFIGURED':'GPU WORKER NOT CONNECTED'}</span><small>Advanced diagnostics are in Settings.</small></div>
    </div>
    <nav className="studioFlow" aria-label="Session setup">
      {steps.map(({id,title,desc,icon:Icon},i)=><React.Fragment key={id}>
        <button className={active===id?'active':''} onClick={()=>go(id)}><span className="flowIcon"><Icon size={16}/></span><span><b>{title}</b><small>{desc}</small></span>{i<3&&<ArrowRight className="flowArrow" size={14}/>}</button>
      </React.Fragment>)}
    </nav>
    <div className="studioPreflight">
      <span><CheckCircle2 size={14}/> Source</span>
      <span><CheckCircle2 size={14}/> Avatar</span>
      <span><AlertCircle size={14}/> GPU</span>
      <span><AlertCircle size={14}/> Destination</span>
      <button onClick={()=>setActive('start')}><Settings2 size={14}/> Preflight</button>
    </div>
    <LiveSessionEngine/>
  </section>;
}
