import { useEffect, useMemo, useRef, useState } from 'react';
import { getVoiceProfiles, type VoiceProfile } from '../endpoints/voice-profiles_GET.schema';
import { postVoiceClone } from '../endpoints/voice-clone_POST.schema';
import { postVoiceTts } from '../endpoints/voice-tts_POST.schema';

type Tab = 'call' | 'stream';
type Lab = 'simulation' | 'voice' | 'media' | 'forensics';
type VoiceStyle = 'Conversational' | 'Broadcast presenter' | 'Analytical' | 'Calm';

function CounterCurtain({onDone}:{onDone:()=>void}) {
  const [p,setP]=useState(0);
  useEffect(()=>{ const start=performance.now(); let raf=0; const tick=(now:number)=>{ const elapsed=now-start; const time=Math.min(1,elapsed/1800); const next=Math.min(1,time<1?time*(2-time):1); setP(next); if(next<1) raf=requestAnimationFrame(tick); else setTimeout(onDone,260); }; raf=requestAnimationFrame(tick); return()=>cancelAnimationFrame(raf); },[]);
  return <div className={'counterCurtain '+(p>=1?'counterLeaving':'')} role='progressbar' aria-valuenow={Math.round(p*100)} aria-valuemin={0} aria-valuemax={100}><div className='counterPanel'><div className='counterNumber'>{Math.round(p*100)}<small>%</small></div><div className='counterLabel'>Loading LiveSim Lab</div><div className='counterLine'><span style={{transform:'scaleX('+p+')'}}/></div></div></div>;
}

function VoiceOrb({level,speaking}:{level:number;speaking:boolean}) {
  const scaled=Math.min(1,Math.max(0,level));
  return <div className={'voiceOrb '+(speaking?'speaking':'idle')} style={{'--orb-level':scaled} as React.CSSProperties} aria-label={speaking?'Voice output active':'Voice output ready'}><div className='orbCore'><i/><i/><i/></div><div className='orbRing'/></div>;
}

const participants = [
  { name: 'Alex Morgan', role: 'Host · simulated', state: 'synthetic', initials: 'AM' },
  { name: 'Research Room', role: 'Observer', state: 'monitoring', initials: 'RR' },
  { name: 'BTC Ledger Bot', role: 'Synthetic data', state: 'analysis', initials: 'BL' },
];

const baseEvents = [
  ['21:57:08', 'STREAM', 'Playback loop started', 'info'],
  ['21:57:14', 'CALL', 'Synthetic participant joined', 'success'],
  ['21:57:22', 'BTC', 'Demo transaction parsed', 'warning'],
  ['21:57:31', 'MEDIA', 'Frame marker inserted', 'info'],
];

const chat = [
  ['@viewer_104', 'This is interesting'],
  ['@viewer_882', 'Can you explain that again?'],
  ['@viewer_231', 'Where did that transaction come from?'],
  ['@viewer_517', '🔥🔥'],
  ['@viewer_902', 'Is this happening right now?'],
];

export default function Home() {
  const [playing, setPlaying] = useState(true);
  const [tab, setTab] = useState<Tab>('call');
  const [lab, setLab] = useState<Lab>('simulation');
  const [scenario, setScenario] = useState('Synthetic investor call');
  const [voice, setVoice] = useState('Synthetic Voice 01');
  const [voiceStyle, setVoiceStyle] = useState<VoiceStyle>('Conversational');
  const [voiceSpeed, setVoiceSpeed] = useState(1);
  const [eventsShown, setEventsShown] = useState(baseEvents);
  const [streaming, setStreaming] = useState(false);
  const [viewers, setViewers] = useState(1284);
  const [voiceProfiles, setVoiceProfiles] = useState<VoiceProfile[]>([]);
  const [selectedProviderVoiceId, setSelectedProviderVoiceId] = useState('');
  const [cloneTitle, setCloneTitle] = useState('Authorized Voice Clone');
  const [authorizationConfirmed, setAuthorizationConfirmed] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [synthesizing, setSynthesizing] = useState(false);
  const [voiceText, setVoiceText] = useState('This is a controlled LiveSim Lab voice simulation.');
  const [voiceOutputUrl, setVoiceOutputUrl] = useState('');
  const [streamVoiceArmed, setStreamVoiceArmed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [orbLevel, setOrbLevel] = useState(0.08);
  const [orbSpeaking, setOrbSpeaking] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const analyserRef = useRef<{ctx:AudioContext; analyser:AnalyserNode; source:MediaElementAudioSourceNode} | null>(null);
  const progress = useMemo(() => playing ? 67 : 42, [playing]);

  useEffect(() => {
    getVoiceProfiles().then(result => setVoiceProfiles(result.profiles)).catch(() => addEvent('VOICE', 'No saved voice profiles loaded', 'warning'));
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !voiceOutputUrl) return;
    audio.src = voiceOutputUrl;
    const onPlay = async () => {
      try {
        const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return;
        if (!analyserRef.current) {
          const ctx = new AudioCtx();
          const analyser = ctx.createAnalyser(); analyser.fftSize = 256; analyser.smoothingTimeConstant = .72;
          const source = ctx.createMediaElementSource(audio); source.connect(analyser); analyser.connect(ctx.destination);
          analyserRef.current = {ctx, analyser, source};
        }
        await analyserRef.current.ctx.resume();
        setOrbSpeaking(true);
        const data = new Uint8Array(analyserRef.current.analyser.frequencyBinCount);
        let raf = 0;
        const draw = () => {
          if (!analyserRef.current || audio.paused || audio.ended) { setOrbLevel(.06); setOrbSpeaking(false); return; }
          analyserRef.current.analyser.getByteFrequencyData(data);
          let sum=0; for(const n of data) sum += n;
          const level = Math.min(1, (sum/data.length)/255*2.7);
          setOrbLevel(level); raf=requestAnimationFrame(draw);
        };
        draw();
        audio.addEventListener('pause',()=>cancelAnimationFrame(raf),{once:true});
      } catch { setOrbSpeaking(true); setOrbLevel(.35); }
    };
    const onEnd = () => { setOrbSpeaking(false); setOrbLevel(.06); };
    audio.addEventListener('play',onPlay); audio.addEventListener('ended',onEnd); audio.addEventListener('pause',onEnd);
    return () => { audio.removeEventListener('play',onPlay); audio.removeEventListener('ended',onEnd); audio.removeEventListener('pause',onEnd); };
  }, [voiceOutputUrl]);

  const addEvent = (kind: string, text: string, level = 'info') => {
    setEventsShown(e => [[new Date().toLocaleTimeString([], {hour12:false}), kind, text, level], ...e].slice(0, 10));
  };

  const startStream = () => {
    const next = !streaming;
    setStreaming(next);
    setViewers(next ? 1284 : 0);
    addEvent('STREAM', next ? 'Synthetic livestream simulation started' : 'Synthetic livestream simulation stopped', next ? 'success' : 'info');
  };

  const cloneVoice = async (file: File | undefined) => {
    if (!file) return;
    if (!authorizationConfirmed) {
      addEvent('VOICE', 'Clone blocked: ownership/authorization confirmation required', 'warning');
      return;
    }
    setCloning(true);
    addEvent('VOICE', 'Uploading authorized reference audio to Fish Audio');
    try {
      const result = await postVoiceClone({ title: cloneTitle, authorizationConfirmed: true, sourceFilename: file.name }, file);
      const created = { id: result.id, provider: result.provider, providerVoiceId: result.providerVoiceId, displayName: result.displayName, sourceFilename: file.name, authorizationConfirmed: true, status: result.status, createdAt: new Date() };
      setVoiceProfiles(current => [created, ...current]);
      setVoice(result.displayName);
      setSelectedProviderVoiceId(result.providerVoiceId);
      addEvent('VOICE', `Fish Audio voice profile created: ${result.displayName}`, 'success');
    } catch (error) {
      addEvent('VOICE', error instanceof Error ? error.message : 'Voice clone failed', 'warning');
    } finally {
      setCloning(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const synthesizeVoice = async () => {
    if (!selectedProviderVoiceId) {
      addEvent('VOICE', 'Select an authorized cloned voice before generating speech', 'warning');
      return;
    }
    setSynthesizing(true);
    try {
      const result = await postVoiceTts({ providerVoiceId: selectedProviderVoiceId, text: voiceText, style: voiceStyle });
      setVoiceOutputUrl(`data:${result.mimeType};base64,${result.audioBase64}`);
      setStreamVoiceArmed(false);
      addEvent('VOICE', 'Fish Audio TTS preview generated', 'success');
    } catch (error) {
      addEvent('VOICE', error instanceof Error ? error.message : 'Voice synthesis failed', 'warning');
    } finally {
      setSynthesizing(false);
    }
  };

  return (
    <>
      {loading && <CounterCurtain onDone={()=>setLoading(false)} />}
      <main className="app">
      <header className="topbar">
        <div className="brand"><span className="brandMark">LS</span><div><strong>LiveSim Lab</strong><small>MEDIA SIMULATION CONSOLE</small></div></div>
        <div className="safety"><span className="dot"/> SIMULATION MODE <span className="sep">·</span> NO REAL IDENTITIES</div>
        <button className="ghost" onClick={() => addEvent('SYSTEM','Audit marker added')}>+ Audit marker</button>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">SAFE MEDIA RESEARCH / 01</p>
          <h1>Study the mechanics of a <em>convincing call.</em></h1>
          <p className="lede">A controlled environment for understanding simulated livestreams, video calls, synthetic voices, playback cues and synthetic Bitcoin activity—without impersonating real people, platforms or wallets.</p>
        </div>
        <div className="scenarioBox">
          <label>SCENARIO</label>
          <select value={scenario} onChange={e => { setScenario(e.target.value); addEvent('SCENARIO', 'Scenario changed to ' + e.target.value); }}>
            <option>Synthetic investor call</option>
            <option>Pre-recorded livestream</option>
            <option>Video-call social engineering</option>
            <option>Bitcoin transaction walkthrough</option>
          </select>
          <span>All identities, voices, audiences and transactions are synthetic or authorized for simulation.</span>
        </div>
      </section>

      <nav className="labNav" aria-label="Simulation labs">
        {([['simulation','Simulation'],['voice','Voice Lab'],['media','Media Lab'],['forensics','Forensics']] as [Lab,string][]).map(([id,label]) =>
          <button key={id} className={lab===id?'active':''} onClick={()=>setLab(id)}>{label}</button>
        )}
      </nav>

      <section className="workspace">
        <div className="panel media">
          <div className="panelHead">
            <div className="tabs"><button className={tab==='call'?'active':''} onClick={()=>setTab('call')}>Video call</button><button className={tab==='stream'?'active':''} onClick={()=>setTab('stream')}>Livestream</button></div>
            <span className="tag">{tab==='stream' ? 'SIMULATED LIVE' : 'PRE-RECORDED / SYNTHETIC'}</span>
          </div>

          {tab === 'stream' ? (
            <div className="streamStage">
              <div className="stageGrid"/>
              <div className="streamPreview">
                <span className="liveBadge">{streaming ? '● SIMULATED LIVE' : 'SIMULATION READY'}</span>
                <div className="avatar">AM</div>
                <b>Alex Morgan</b>
                <small>synthetic presenter · not a real person</small>
                <div className="streamWatermark">LIVE SIM LAB</div>
              </div>
              <div className="streamStats"><span>{streaming ? viewers.toLocaleString() : '—'} simulated viewers</span><span>{streaming ? '01:24:18' : '00:00:00'}</span></div>
              <div className="chatOverlay">
                <b>SIMULATED CHAT</b>
                {chat.slice(0,3).map(([user,msg])=><div key={user}><strong>{user}</strong> {msg}</div>)}
              </div>
              {streamVoiceArmed && voiceOutputUrl && <div className="streamAudio"><span>VOICE OUTPUT ARMED · SIMULATION</span><audio controls src={voiceOutputUrl}/></div>}
            </div>
          ) : (
            <div className="stage">
              <div className="stageGrid"/>
              <div className="fakeVideo">
                <div className="avatar">AM</div>
                <div className="videoLabel"><b>Alex Morgan</b><span>AI-generated simulation · not a real person</span></div>
                <div className="watermark">SIMULATED</div>
              </div>
              <div className="miniCall"><span className="miniAvatar">RR</span><span>Research Room</span><i>Observer</i></div>
              <div className="mediaHud"><span>{playing ? '00:14:28' : '00:09:07'}</span><span>{progress}%</span></div>
            </div>
          )}

          <div className="controls">
            <button className="play" onClick={()=>setPlaying(!playing)}>{playing?'Ⅱ':'▶'}</button>
            <div className="scrub"><span style={{width: progress + '%'}}/></div>
            <span className="mono">{playing ? 'PLAYING' : 'PAUSED'}</span>
            {tab === 'stream' && <button className={streaming ? 'dangerBtn' : 'streamBtn'} onClick={startStream}>{streaming ? 'STOP SIM' : 'START SIM'}</button>}
            <button onClick={()=>addEvent('MEDIA', playing?'Playback paused':'Playback resumed')}>MARK</button>
          </div>
        </div>

        <aside className="panel participants">
          <div className="panelHead"><h2>Participants</h2><span className="count">03</span></div>
          {participants.map(p=><div className="participant" key={p.name}><span className="avatar small">{p.initials}</span><div><b>{p.name}</b><small>{p.role}</small></div><span className={'state ' + p.state}>{p.state}</span></div>)}
          <div className="rule"/>
          <div className="integrity"><span>◉</span><div><b>Integrity lock</b><small>No camera, microphone, wallet or identity data is captured.</small></div></div>
        </aside>
      </section>

      <section className="toolsGrid">
        <div className="panel toolPanel">
          <div className="panelHead"><div><p className="eyebrow">VOICE LAB</p><h2>Voice simulation</h2></div><span className="tag">AUTHORIZED / SYNTHETIC</span></div>
          <div className="toolBody">
            <VoiceOrb level={orbLevel} speaking={orbSpeaking}/>
            <audio ref={audioRef} className="voiceAudioEngine" preload="auto" />
            <label>Voice profile</label>
            <div className="voiceRow"><select value={voice} onChange={e=>{setVoice(e.target.value);const profile=voiceProfiles.find(p=>p.displayName===e.target.value);setSelectedProviderVoiceId(profile?.providerVoiceId ?? '');addEvent('VOICE','Voice profile selected: '+e.target.value)}}><option>Synthetic Voice 01</option><option>Synthetic Voice 02</option>{voiceProfiles.map(profile=><option key={profile.id}>{profile.displayName}</option>)}</select><button className="outline" onClick={()=>fileInputRef.current?.click()} disabled={cloning}>{cloning ? 'CLONING…' : 'Upload voice'}</button></div>
            <input ref={fileInputRef} className="hiddenFile" type="file" accept="audio/mpeg,audio/wav,audio/x-wav,audio/flac,audio/mp4,audio/x-m4a,audio/ogg,audio/webm" onChange={e=>cloneVoice(e.target.files?.[0])}/>
            <div className="cloneForm">
              <input value={cloneTitle} onChange={e=>setCloneTitle(e.target.value)} placeholder="Voice profile name" aria-label="Voice profile name"/>
              <label className="consent"><input type="checkbox" checked={authorizationConfirmed} onChange={e=>setAuthorizationConfirmed(e.target.checked)}/><span>I own this voice or have authorization to clone it.</span></label>
              <small>Use a clean reference clip; about 10 seconds or more is recommended. Authorization is recorded by LiveSim Lab but not independently verified.</small>
            </div>
            <div className="voiceMeta"><span>✓ Server-side Fish Audio credential</span><span>✓ Private provider voice profile</span><span>✓ Synthetic output label</span></div>
            <label>Style</label>
            <select value={voiceStyle} onChange={e=>setVoiceStyle(e.target.value as VoiceStyle)}><option>Conversational</option><option>Broadcast presenter</option><option>Analytical</option><option>Calm</option></select>
            <div className="sliderRow"><span>Speed</span><input type="range" min=".75" max="1.25" step=".05" value={voiceSpeed} onChange={e=>setVoiceSpeed(Number(e.target.value))}/><span>{voiceSpeed.toFixed(2)}×</span></div>
            <label>Speech to synthesize</label>
            <textarea className="voiceText" value={voiceText} onChange={e=>setVoiceText(e.target.value)} rows={3}/>
            <div className="voiceActions"><button className="outline" onClick={synthesizeVoice} disabled={synthesizing}>{synthesizing ? 'GENERATING…' : '▶ Generate preview'}</button><button className="primaryBtn" onClick={()=>{if(!voiceOutputUrl){addEvent('VOICE','Generate a preview before applying output','warning');return;}setStreamVoiceArmed(tab==='stream');addEvent('VOICE','Voice output armed for '+(tab==='stream'?'livestream simulation':'call simulation'),'success')}}>Apply to {tab}</button></div>
            {voiceOutputUrl && <div className="audioPreview"><span>FISH AUDIO OUTPUT · SIMULATED</span><audio controls src={voiceOutputUrl}/></div>}
            <small className="safetyNote">Voice cloning is limited to voices you own or are authorized to use. Generated speech remains marked as simulation.</small>
          </div>
        </div>

        <div className="panel toolPanel">
          <div className="panelHead"><div><p className="eyebrow">LIVE STREAM LAB</p><h2>Audience simulation</h2></div><span className="tag">NO REAL VIEWERS</span></div>
          <div className="toolBody">
            <div className="metricRow"><div><b>{viewers.toLocaleString()}</b><small>simulated viewers</small></div><div><b>{chat.length}</b><small>chat events</small></div><div><b>04</b><small>stream markers</small></div></div>
            <div className="chatList">{chat.map(([user,msg])=><div key={user}><strong>{user}</strong><span>{msg}</span></div>)}</div>
            <div className="voiceActions"><button className="outline" onClick={()=>addEvent('CHAT','Synthetic chat burst generated')}>Generate chat burst</button><button className="outline" onClick={()=>addEvent('AUDIENCE','Synthetic viewer spike simulated')}>Simulate spike</button></div>
          </div>
        </div>
      </section>

      <section className="lower">
        <div className="panel ledger">
          <div className="panelHead"><div><p className="eyebrow">SYNTHETIC LEDGER</p><h2>Bitcoin activity</h2></div><span className="tag yellow">DEMO DATA</span></div>
          <div className="tx"><div className="coin">₿</div><div><b>bc1q…7m2k</b><small>synthetic sender → synthetic receiver</small></div><strong>0.018420 BTC</strong></div>
          <div className="txMeta"><span>TX DEMO-7F2A</span><span>6 confirmations (simulated)</span><span>Fee 0.000012 BTC</span></div>
          <button className="outline" onClick={()=>addEvent('BTC','Synthetic transaction inspected','warning')}>Inspect synthetic transaction</button>
        </div>
        <div className="panel logs">
          <div className="panelHead"><div><p className="eyebrow">EVENT LOG</p><h2>Timeline</h2></div><button className="ghost" onClick={()=>setEventsShown([])}>Clear</button></div>
          <div className="eventList">{eventsShown.length ? eventsShown.map((e,i)=><div className="event" key={i}><time>{e[0]}</time><span className={'eventDot ' + e[3]}/><div><b>{e[1]}</b><span>{e[2]}</span></div></div>) : <div className="empty">No events. Use the console controls to create audit markers.</div>}</div>
        </div>
      </section>

      <footer><span>LiveSim Lab · research console</span><span>SIMULATED MEDIA · SYNTHETIC VOICES · SYNTHETIC BTC · NO REAL TRANSACTIONS</span></footer>
    </main>
    </>
  );
}
