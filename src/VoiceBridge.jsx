import React,{useEffect,useRef,useState} from 'react';
import {Mic,Upload,Volume2,ShieldCheck,Play,Square,RefreshCw} from 'lucide-react';

export default function VoiceBridge(){
 const worker=import.meta.env.VITE_LIVESIM_VOICE_WORKER_URL||'';
 const [status,setStatus]=useState('offline'),[profile,setProfile]=useState(null),[authorized,setAuthorized]=useState(false),[transcript,setTranscript]=useState(''),[text,setText]=useState(''),[audioUrl,setAudioUrl]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const audio=useRef(null);
 useEffect(()=>{if(!worker)return;fetch(worker.replace(/\/$/,'')+'/health').then(r=>r.ok?r.json():null).then(d=>setStatus(d?.ok?'online':'error')).catch(()=>setStatus('offline'))},[worker]);
 const upload=async e=>{const f=e.target.files?.[0];if(!f)return;if(!authorized)return setMessage('Confirm that you own or have permission to use this voice.');if(!transcript.trim())return setMessage('Add the exact transcript spoken in the reference sample.');if(!worker)return setMessage('Voice worker URL is not configured.');setBusy(true);setMessage('Loading voice profile…');try{const fd=new FormData();fd.append('audio',f);fd.append('transcript',transcript);fd.append('authorized','true');const r=await fetch(worker.replace(/\/$/,'')+'/profiles',{method:'POST',body:fd});const d=await r.json();if(!r.ok)throw new Error(d.detail||d.error||'Profile creation failed');setProfile({id:d.id,name:f.name});setMessage('Voice profile ready.');}catch(err){setMessage(err.message)}finally{setBusy(false)}};
 const synth=async()=>{if(!profile)return setMessage('Create a voice profile first.');if(!text.trim())return setMessage('Enter text to synthesize.');setBusy(true);setMessage('Generating speech…');try{const r=await fetch(worker.replace(/\/$/,'')+'/synthesize',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({profileId:profile.id,text,steps:16,speed:1})});if(!r.ok){const d=await r.json().catch(()=>({}));throw new Error(d.detail||'Synthesis failed')}const blob=await r.blob();if(audioUrl)URL.revokeObjectURL(audioUrl);const u=URL.createObjectURL(blob);setAudioUrl(u);setMessage('Speech generated.');setTimeout(()=>audio.current?.play().catch(()=>{}),0)}catch(err){setMessage(err.message)}finally{setBusy(false)}};
 const stop=()=>{audio.current?.pause();if(audio.current)audio.current.currentTime=0};
 return <section className='voiceBridge'><div className='voiceHero'><div><span>AUTHORIZED VOICE ENGINE</span><h2>Voice profile → neural TTS</h2><p>Use a voice sample you own or are explicitly authorized to use. The worker keeps the model loaded locally and returns WAV audio for the session pipeline.</p></div><div className={'voiceState '+status}><i/>{status.toUpperCase()}</div></div>
 <div className='voiceGrid'><div className='voiceCard'><div className='voiceHead'><ShieldCheck size={20}/><div><b>1. Create voice profile</b><small>Reference audio + exact transcript</small></div></div>
 <label className='voiceConsent'><input type='checkbox' checked={authorized} onChange={e=>setAuthorized(e.target.checked)}/> I own this voice or have explicit permission to clone it.</label>
 <textarea value={transcript} onChange={e=>setTranscript(e.target.value)} placeholder='Exact words spoken in the reference recording…' rows='3'/>
 <input id='voice-ref' hidden type='file' accept='audio/*' onChange={upload}/><button onClick={()=>document.getElementById('voice-ref')?.click()} disabled={busy||!authorized}><Upload size={15}/> {profile?'Replace reference':'Load reference audio'}</button>
 {profile&&<div className='voiceProfile'><Mic size={15}/><b>{profile.name}</b><span>{profile.id}</span></div>}</div>
 <div className='voiceCard'><div className='voiceHead'><Volume2 size={20}/><div><b>2. Generate speech</b><small>F5-TTS zero-shot synthesis</small></div></div>
 <textarea value={text} onChange={e=>setText(e.target.value)} placeholder='Type what the authorized voice should say…' rows='5'/>
 <button className='primary' onClick={synth} disabled={busy||!profile}>{busy?<><RefreshCw size={15}/> Working…</>:<><Play size={15}/> Generate voice</>}</button>
 {audioUrl&&<div className='voicePlayer'><audio ref={audio} src={audioUrl} controls/><button onClick={stop}><Square size={13}/> Stop</button></div>}</div></div>
 <div className='voiceNotice'>{message||'Voice output is local to the configured worker. No voice sample is uploaded to Vercel.'}</div>
 </section>
}