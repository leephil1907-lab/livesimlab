import React,{useMemo,useState} from 'react';
import {Camera,CameraOff,ChevronDown,Grid2X2,Hand,Headphones,Layers3,Mic,MicOff,MonitorUp,MoreHorizontal,Palette,PhoneOff,Pin,Play,Send,Settings,ShieldCheck,Sparkles,UserRound,Users,Volume2, Wand2, X} from 'lucide-react';
import './live-call-studio.css';

const CHARACTERS=[
 {id:'cyber',name:'Cyber Operator',kind:'Fictional',tone:'cyan',desc:'Neon tactical character'},
 {id:'oracle',name:'Moon Oracle',kind:'Fictional',tone:'violet',desc:'Expressive fantasy presenter'},
 {id:'sage',name:'Old Sage',kind:'Fictional',tone:'amber',desc:'Warm storyteller'},
 {id:'custom',name:'Authorized Custom',kind:'Your media',tone:'lime',desc:'Use an image you own or have permission to use'}
];
const SCENES=['Studio Dark','Neon Grid','Clean Office','Custom Background'];

export default function LiveCallStudio(){
 const [camera,setCamera]=useState(true),[mic,setMic]=useState(true),[character,setCharacter]=useState('cyber'),[scene,setScene]=useState('Studio Dark'),[prompt,setPrompt]=useState(''),[running,setRunning]=useState(false),[panel,setPanel]=useState('characters'),[layout,setLayout]=useState('spotlight'),[hand,setHand]=useState(false),[message,setMessage]=useState('');
 const selected=CHARACTERS.find(x=>x.id===character)||CHARACTERS[0];
 const status=running?'AI OUTPUT LIVE':'CAMERA READY';
 const callTiles=useMemo(()=>[
  {name:'You',role:'Local studio',tone:selected.tone,local:true},
  {name:'Participant A',role:'Authorized call peer',tone:'violet'},
  {name:'Participant B',role:'Authorized call peer',tone:'blue'}
 ],[selected.tone]);

 return <section className="liveCallStudio" aria-label="Live call studio">
  <header className="lcsHeader">
   <div className="lcsBrand"><div className="lcsLogo"><Sparkles size={17}/></div><div><b>Live Call Studio</b><span>REAL-TIME MEDIA WORKSPACE</span></div></div>
   <div className="lcsStatus"><i className={running?'live':''}/>{status}<b>Room 7F-29</b></div>
   <div className="lcsActions"><button title="Settings"><Settings size={16}/></button><button title="More"><MoreHorizontal size={18}/></button></div>
  </header>

  <div className="lcsNotice"><ShieldCheck size={14}/><span>Simulation surface. Use only authorized faces, voices, media and accounts. AI-generated characters are clearly marked.</span><button>View policy</button></div>

  <div className="lcsWorkspace">
   <aside className="lcsLeft">
    <div className="lcsSectionTitle"><span>CHARACTER</span><button onClick={()=>setPanel('characters')}>Manage</button></div>
    <div className="characterPreview">
      <div className={'characterOrb '+selected.tone}><UserRound size={34}/><span>AI</span></div>
      <div><b>{selected.name}</b><small>{selected.kind} · {selected.desc}</small></div>
      <span className="aiBadge">AI</span>
    </div>
    <div className="characterList">{CHARACTERS.map(c=><button key={c.id} className={character===c.id?'selected':''} onClick={()=>setCharacter(c.id)}><span className={'miniChar '+c.tone}>{c.name.slice(0,1)}</span><span><b>{c.name}</b><small>{c.kind}</small></span>{character===c.id&&<span className="check">✓</span>}</button>)}</div>
    <button className="uploadCharacter" onClick={()=>setCharacter('custom')}><Wand2 size={14}/> Add authorized reference</button>
   </aside>

   <main className="lcsStage">
    <div className="stageToolbar"><div className="stagePill"><i className={running?'live':''}/>{running?'LIVE AI OUTPUT':'LOCAL PREVIEW'}</div><div className="stageTools"><button onClick={()=>setLayout(layout==='spotlight'?'grid':'spotlight')}><Grid2X2 size={15}/></button><button><MonitorUp size={15}/></button><button><Settings size={15}/></button></div></div>
    {layout==='spotlight'?<div className="lcsSpotlight"><CallTile person={callTiles[0]} large running={running}/><div className="lcsFilmstrip">{callTiles.slice(1).map(p=><CallTile key={p.name} person={p}/>)}</div></div>:<div className="lcsGrid">{callTiles.map(p=><CallTile key={p.name} person={p}/>)}</div>}
    <div className="stageWatermark">LIVESIM / SYNTHETIC MEDIA</div>
    <div className="stagePrompt"><Sparkles size={15}/><input value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="Describe a visual change — e.g. add a blue jacket…" /><button onClick={()=>setPrompt('')} disabled={!prompt}><Wand2 size={14}/> Apply</button></div>
   </main>

   <aside className="lcsInspector">
    <div className="inspectorTabs"><button className={panel==='characters'?'on':''} onClick={()=>setPanel('characters')}><UserRound size={14}/> Character</button><button className={panel==='scene'?'on':''} onClick={()=>setPanel('scene')}><Palette size={14}/> Scene</button><button className={panel==='chat'?'on':''} onClick={()=>setPanel('chat')}><Send size={14}/> Chat</button></div>
    {panel==='characters'&&<div className="inspectorBody"><label>CHARACTER MODE</label><div className="modeGrid"><button className="active">Expressive</button><button>Natural</button><button>Stylized</button></div><label>OUTPUT QUALITY</label><select><option>HD · 1280 × 720</option><option>Standard · 720p</option><option>Preview · 480p</option></select><label>PROCESSING</label><div className="signalCard"><span><i className={running?'live':''}/> Neural renderer</span><b>{running?'Connected':'Ready'}</b></div><div className="signalCard"><span><i/> Voice bridge</span><b>{mic?'Ready':'Muted'}</b></div></div>}
    {panel==='scene'&&<div className="inspectorBody"><label>SCENE / BACKGROUND</label><div className="sceneGrid">{SCENES.map(s=><button className={scene===s?'selected':''} key={s} onClick={()=>setScene(s)}><span className="sceneThumb">{s==='Neon Grid'?'GRID':s==='Clean Office'?'ROOM':s==='Custom Background'?'IMG':'STUDIO'}</span><b>{s}</b></button>)}</div><label>SCENE PROMPT</label><textarea placeholder="Describe the environment…" /><button className="fullButton"><Palette size={14}/> Apply scene</button></div>}
    {panel==='chat'&&<div className="inspectorBody chatPanel"><label>LIVE CALL CHAT</label><div className="messages"><div><b>System</b><p>Simulation room connected.</p><small>Now</small></div><div><b>Participant A</b><p>Ready when you are.</p><small>12:47</small></div></div><div className="composer"><input value={message} onChange={e=>setMessage(e.target.value)} onKeyDown={e=>e.key==='Enter'&&setMessage('')} placeholder="Send a message…" /><button onClick={()=>setMessage('')}><Send size={14}/></button></div></div>}
   </aside>
  </div>

  <footer className="lcsControls">
   <div className="deviceControls"><button className={mic?'':'off'} onClick={()=>setMic(v=>!v)}>{mic?<Mic size={17}/>:<MicOff size={17}/>}<span>{mic?'Mute':'Unmute'}</span></button><button className={camera?'':'off'} onClick={()=>setCamera(v=>!v)}>{camera?<Camera size={17}/>:<CameraOff size={17}/>}<span>{camera?'Camera':'Camera off'}</span></button><button className={hand?'active':''} onClick={()=>setHand(v=>!v)}><Hand size={17}/><span>{hand?'Lower hand':'Raise hand'}</span></button><button><Headphones size={17}/><span>Audio</span></button></div>
   <div className="runControl"><span>{scene}</span><button className={running?'stop':'start'} onClick={()=>setRunning(v=>!v)}>{running?<><PhoneOff size={17}/> Stop output</>:<><Play size={17}/> Start AI output</>}</button></div>
   <div className="deviceControls right"><button><Volume2 size={17}/><span>Audio</span><ChevronDown size={11}/></button><button><Users size={17}/><span>People</span><em>3</em></button></div>
  </footer>
 </section>
}

function CallTile({person,large,running}){
 return <article className={'lcsTile '+(large?'large ':'')+(running&&person.local?'processing':'')}>
  <div className={'lcsAvatar '+person.tone}><span>{person.local?'AI':person.name.slice(0,2).toUpperCase()}</span></div>
  {person.local&&running&&<div className="aiVideoLayer"><span>REAL-TIME AI CHARACTER</span><b>GENERATED OUTPUT</b></div>}
  {!person.local&&<div className="remoteLayer"><span>AUTHORIZED REMOTE MEDIA</span></div>}
  <div className="tileMeta"><div><b>{person.name}</b><small>{person.role}</small></div><span>{person.local&&running?'AI LIVE':'HD'}</span></div>
 </article>
}
