import React,{useMemo,useState} from 'react';
import {Camera,CameraOff,ChevronDown,Grid2X2,Hand,LayoutPanelLeft,Mic,MicOff,MoreHorizontal,MonitorUp,PhoneOff,Pin,Send,Settings,ShieldCheck,Smile,Users,Video,Volume2,X} from 'lucide-react';
import './live-call-room.css';

const PEOPLE=[
 {id:'you',name:'You',role:'Local studio',color:'lime',muted:false,camera:true,signal:'Excellent'},
 {id:'participant-a',name:'Participant A',role:'Authorized call peer',color:'violet',muted:false,camera:true,signal:'Good'},
 {id:'participant-b',name:'Participant B',role:'Authorized call peer',color:'blue',muted:true,camera:true,signal:'Good'},
 {id:'participant-c',name:'Participant C',role:'Authorized call peer',color:'amber',muted:false,camera:false,signal:'Fair'}
];

export default function LiveCallRoom(){
 const [mic,setMic]=useState(true),[camera,setCamera]=useState(true),[layout,setLayout]=useState('spotlight'),[panel,setPanel]=useState('none'),[pinned,setPinned]=useState('participant-a'),[hand,setHand]=useState(false),[message,setMessage]=useState('');
 const local={...PEOPLE[0],muted:!mic,camera};
 const people=useMemo(()=>[local,...PEOPLE.slice(1)],[local]);
 const main=people.find(p=>p.id===pinned)||people[1];
 const thumbs=people.filter(p=>p.id!==main.id);
 const send=()=>{if(message.trim())setMessage('')};
 return <section className="liveCallRoom" aria-label="Live call room">
  <header className="callRoomHeader">
   <div className="callRoomIdentity"><div className="callRoomDot"/><div><b>Live Call Room</b><span>SIMULATION / AUTHORIZED MEDIA</span></div></div>
   <div className="callRoomMeta"><span><i/> Connected</span><b>Room 7F-29</b><span>12:48</span></div>
   <div className="callRoomHeaderActions"><button onClick={()=>setPanel(panel==='participants'?'none':'participants')} aria-label="Participants"><Users size={16}/><em>{people.length}</em></button><button onClick={()=>setPanel(panel==='chat'?'none':'chat')} aria-label="Chat"><Send size={16}/></button><button aria-label="More"><MoreHorizontal size={18}/></button></div>
  </header>

  <div className={'callRoomBody '+(panel!=='none'?'withPanel':'')}>
   <div className="callStage">
    <div className="callStageTop"><div className="callLiveBadge"><span/> LIVE CALL PREVIEW</div><div className="callStageTools"><button onClick={()=>setLayout(layout==='spotlight'?'grid':'spotlight')} title="Change layout">{layout==='spotlight'?<Grid2X2 size={15}/>:<LayoutPanelLeft size={15}/>}</button><button title="Call settings"><Settings size={15}/></button></div></div>
    {layout==='spotlight'?<div className="callSpotlight">
      <CallTile person={main} large pinned={pinned===main.id} onPin={()=>setPinned(main.id)}/>
      <div className="callFilmstrip">{thumbs.map(p=><CallTile key={p.id} person={p} compact onPin={()=>setPinned(p.id)}/>)}</div>
    </div>:<div className="callGrid">{people.map(p=><CallTile key={p.id} person={p} onPin={()=>setPinned(p.id)}/>)}</div>}
    <div className="callDisclosure"><ShieldCheck size={13}/><span>LiveSim simulation surface · use only authorized faces, voices, media and accounts</span></div>
   </div>

   <aside className="callSidebar">
    {panel==='chat'?<ChatPanel message={message} setMessage={setMessage} send={send}/>:<ParticipantsPanel people={people} pinned={pinned} setPinned={setPinned}/>}
   </aside>
  </div>

  <footer className="callControls">
   <div className="callDeviceGroup"><button className={mic?'':'off'} onClick={()=>setMic(v=>!v)} aria-pressed={!mic}>{mic?<Mic size={18}/>:<MicOff size={18}/>}<span>{mic?'Mute':'Unmute'}</span></button><button className={camera?'':'off'} onClick={()=>setCamera(v=>!v)} aria-pressed={!camera}>{camera?<Camera size={18}/>:<CameraOff size={18}/>}<span>{camera?'Camera':'Camera off'}</span></button><button onClick={()=>setHand(v=>!v)} className={hand?'active':''} aria-pressed={hand}><Hand size={18}/><span>{hand?'Lower hand':'Raise hand'}</span></button><button onClick={()=>setPanel(panel==='chat'?'none':'chat')}><Send size={18}/><span>Chat</span></button></div>
   <div className="callMainControls"><button className="endCall" title="Leave call"><PhoneOff size={19}/></button></div>
   <div className="callDeviceGroup right"><button><MonitorUp size={18}/><span>Present</span></button><button><Volume2 size={18}/><span>Audio</span><ChevronDown size={12}/></button><button onClick={()=>setPanel(panel==='participants'?'none':'participants')}><Users size={18}/><span>People</span><em>{people.length}</em></button></div>
  </footer>
 </section>
}

function CallTile({person,large,compact,onPin}){
 return <article className={'callTile '+(large?'large ':'')+(compact?'compact ':'')+(person.id==='participant-a'?'speaking ':'')+(person.camera?'':'cameraOff')} onDoubleClick={onPin}>
  <div className={'callAvatar '+person.color}><span>{person.name==='You'?'YO':person.name.split(' ').map(x=>x[0]).join('').slice(0,2)}</span></div>
  {person.camera&&<div className="callSyntheticVideo"><span>{person.name==='You'?'LOCAL CAMERA':'REMOTE MEDIA'}</span></div>}
  <div className="callTileTop"><span className="signal">{person.signal}</span>{person.id==='participant-a'&&<span className="speakingBadge">Speaking</span>}</div>
  <div className="callTileBottom"><span><b>{person.name}</b><small>{person.role}</small></span><span className="tileActions">{person.muted&&<MicOff size={13}/>}<button onClick={e=>{e.stopPropagation();onPin()}} title="Pin participant"><Pin size={13}/></button></span></div>
 </article>
}

function ParticipantsPanel({people,pinned,setPinned}){
 return <div className="callPanel"><div className="callPanelHead"><div><span>ROOM</span><h3>Participants</h3></div><b>{people.length}</b></div><div className="participantList">{people.map(p=><button key={p.id} className={pinned===p.id?'selected':''} onClick={()=>setPinned(p.id)}><span className={'miniAvatar '+p.color}>{p.name.slice(0,1)}</span><span><b>{p.name}</b><small>{p.role}</small></span><span className="participantState">{p.muted?<MicOff size={13}/>:<Mic size={13}/>} {p.signal}</span></button>)}</div><div className="panelNote"><ShieldCheck size={14}/><span>Participant identities are labels for the authorized simulation session. No identity is inferred.</span></div></div>
}

function ChatPanel({message,setMessage,send}){
 return <div className="callPanel"><div className="callPanelHead"><div><span>ROOM</span><h3>Call chat</h3></div><button><X size={16}/></button></div><div className="chatMessages"><div className="chatBubble"><b>System</b><p>Simulation room connected. Chat is local to this workspace.</p><time>Now</time></div><div className="chatBubble"><b>Participant A</b><p>Ready when you are.</p><time>12:47</time></div></div><div className="chatComposer"><input value={message} onChange={e=>setMessage(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="Send a message…" aria-label="Chat message"/><button onClick={send}><Send size={15}/></button></div></div>
}
