import React,{useEffect,useMemo,useState} from 'react';
import {AlertTriangle,Camera,CheckCircle2,RefreshCw,ShieldCheck,Wifi,Zap} from 'lucide-react';

const OBS_URL='ws://127.0.0.1:4455';

export default function SetupAssistant({camera,worker,gateway,destination,voice,sourceReady,onStartCamera,onWorkerHelp,onDestination,onVoice,onRefresh,onPreflight,onObsStatus}){
 const [obs,setObs]=useState('checking');
 const [obsVersion,setObsVersion]=useState('');
 const [checking,setChecking]=useState(false);

 const checkObs=()=>{
  setChecking(true);setObs('checking');setObsVersion('');
  let done=false;
  try{
   const ws=new WebSocket(OBS_URL);
   const timer=setTimeout(()=>{if(!done){done=true;try{ws.close()}catch{};setObs('offline');onObsStatus?.(false);setChecking(false)}},2200);
   ws.onopen=()=>{if(done)return;clearTimeout(timer);done=true;setObs('online');onObsStatus?.(true);setChecking(false);try{ws.close()}catch{}};
   ws.onmessage=e=>{try{const m=JSON.parse(e.data);if(m.op===0&&m.d?.obsWebSocketVersion)setObsVersion(m.d.obsWebSocketVersion)}catch{}};
   ws.onerror=()=>{if(done)return;clearTimeout(timer);done=true;setObs('offline');setChecking(false)};
   ws.onclose=()=>{if(!done){clearTimeout(timer);done=true;setObs('offline');setChecking(false)}};
  }catch{setObs('offline');setChecking(false)}
 };
 useEffect(()=>{checkObs();const id=setInterval(checkObs,10000);return()=>clearInterval(id)},[]);

 const steps=useMemo(()=>[
  {n:1,label:'Camera detected',ok:camera,checking:false,detail:camera?'Live camera input is active.':'Start the camera source to give the studio a live input.',action:!camera?onStartCamera:null,actionLabel:'Start camera'},
  {n:2,label:'OBS detected',ok:obs==='online',checking:obs==='checking',detail:obs==='online'?(obsVersion?'OBS WebSocket '+obsVersion+' is reachable.':'OBS WebSocket is reachable.'):'OBS WebSocket is not reachable on localhost:4455.',action:obs!=='online'?checkObs:null,actionLabel:checking?'Checking…':'Check OBS'},
  {n:3,label:'GPU worker',ok:worker==='online',checking:worker==='checking',detail:worker==='online'?'Neural media worker is reachable.':worker==='checking'?'Checking the configured GPU worker…':'Worker offline — start the GPU worker on the workstation.',action:worker!=='online'?onWorkerHelp:null,actionLabel:'Start GPU worker'},
  {n:4,label:'Authorized voice',ok:Boolean(voice),checking:false,detail:voice?'Voice profile selected.':'Select an authorized voice profile before transport.',action:!voice?onVoice:null,actionLabel:'Set voice'},
  {n:5,label:'Destination',ok:Boolean(destination),checking:false,detail:destination?('Destination selected: '+destination+'.'):'Choose exactly one destination for the session.',action:!destination?onDestination:null,actionLabel:'Choose destination'}
 ],[camera,obs,obsVersion,checking,worker,voice,destination,onStartCamera,onWorkerHelp,onVoice,onDestination]);

 const passed=steps.filter(s=>s.ok).length;
 const allReady=passed===steps.length;
 return <section className="setupAssistant" aria-label="LiveSim setup assistant">
  <div className="setupAssistantHead">
   <div className="setupTitle"><span className="setupEyebrow">GUIDED PREFLIGHT</span><h3>Setup Assistant</h3><p>LiveSim checks the control-room dependencies for you. Fix the first red item, then run the check again.</p></div>
   <div className={'setupProgress '+(allReady?'ready':'')}><b>{passed}/5</b><span>{allReady?'READY TO RUN':'SETUP IN PROGRESS'}</span></div>
  </div>
  <div className="setupSteps" aria-live="polite">
   {steps.map((s,i)=><React.Fragment key={s.n}>
    <article className={'setupStep '+(s.ok?'ok ':s.checking?'checking ':'blocked ')}>
     <div className="setupStepIcon">{s.ok?<CheckCircle2 size={18}/>:s.checking?<RefreshCw size={17} className="spin"/>:<AlertTriangle size={17}/>}</div>
     <div className="setupStepCopy"><div><strong>{s.n}/5</strong><b>{s.label}</b></div><p>{s.detail}</p></div>
     {s.action&&<button onClick={s.action} disabled={s.checking}>{s.actionLabel}</button>}
    </article>
    {i<steps.length-1&&<span className={'setupConnector '+(s.ok?'passed':'')} aria-hidden="true"/>}
   </React.Fragment>)}
  </div>
  <div className="setupAssistantFoot">
   <div className="setupSignal"><ShieldCheck size={14}/><span>{allReady?'All five checks passed. Session controls are unlocked.':'The assistant never marks a service ready unless it can observe the required state.'}</span></div>
   <div className="setupActions"><button onClick={onRefresh} disabled={checking}><RefreshCw size={14}/> Refresh checks</button><button className="primary" onClick={onPreflight}><Zap size={14}/> Run full preflight</button></div>
  </div>
 </section>
}
