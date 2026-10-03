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

type EventRow = [string, string, string, string];
type PlatformId = 'whatsapp' | 'googlemeet' | 'zoom' | 'telegram' | 'tiktok' | 'custom';
type Platform = { id: PlatformId; name: string; mode: string; description: string; availability: string; requires: string };

const platforms: Platform[] = [
  { id:'whatsapp', name:'WhatsApp', mode:'Link / supported integration', description:'Use an approved WhatsApp workflow or meeting link. Direct calling depends on the WhatsApp API/product access available to your account.', availability:'Platform-dependent', requires:'Business/API access or an existing call link' },
  { id:'googlemeet', name:'Google Meet', mode:'Meeting link', description:'Launch or attach a Google Meet session and use LiveSim Lab as the media/control workspace around it.', availability:'Available with a Meet link', requires:'Google Meet account and meeting URL' },
  { id:'zoom', name:'Zoom', mode:'Meeting / SDK integration', description:'Connect a Zoom meeting or supported SDK integration for controlled sessions.', availability:'Requires Zoom integration credentials', requires:'Zoom account and approved SDK/API credentials' },
  { id:'telegram', name:'Telegram', mode:'Link / bot workflow', description:'Open a Telegram destination or supported bot workflow. Telegram Bot API does not provide arbitrary user-to-user voice calling.', availability:'Limited for calling', requires:'Telegram destination or bot workflow' },
  { id:'tiktok', name:'TikTok LIVE', mode:'LIVE / creator tools', description:'Prepare a TikTok LIVE destination where your account is eligible. Streaming access and LIVE APIs are subject to TikTok approval and account eligibility.', availability:'Eligibility / approval required', requires:'Eligible TikTok LIVE account and supported streaming access' },
  { id:'custom', name:'Custom RTMP / WebRTC', mode:'Direct stream', description:'Connect a compatible destination using its supported stream or WebRTC details.', availability:'Depends on destination', requires:'Endpoint, stream key or WebRTC configuration' }
];

export default function Home() {
  const [playing, setPlaying] = useState(true);
  const [tab, setTab] = useState<Tab>('call');
  const [lab, setLab] = useState<Lab>('simulation');
  const [scenario, setScenario] = useState('');
  const [voice, setVoice] = useState('');
  const [voiceStyle, setVoiceStyle] = useState<VoiceStyle>('Conversational');
  const [voiceSpeed, setVoiceSpeed] = useState(1);
  const [eventsShown, setEventsShown] = useState<EventRow[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [viewers, setViewers] = useState(0);
  const [voiceProfiles, setVoiceProfiles] = useState<VoiceProfile[]>([]);
  const [selectedProviderVoiceId, setSelectedProviderVoiceId] = useState('');
  const [cloneTitle, setCloneTitle] = useState('Authorized Voice Clone');
  const [authorizationConfirmed, setAuthorizationConfirmed] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [synthesizing, setSynthesizing] = useState(false);
  const [voiceText, setVoiceText] = useState('');
  const [voiceOutputUrl, setVoiceOutputUrl] = useState('');
  const [streamVoiceArmed, setStreamVoiceArmed] = useState(false);
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaName, setMediaName] = useState('');
  const [transactionRef, setTransactionRef] = useState('');
  const [transactionAmount, setTransactionAmount] = useState('');
  const [destination, setDestination] = useState<PlatformId | ''>('');
  const [destinationOpen, setDestinationOpen] = useState<PlatformId | ''>('');
  const [destinationValue, setDestinationValue] = useState('');
  const [destinationConnected, setDestinationConnected] = useState(false);
  const [connectionBusy, setConnectionBusy] = useState(false);
  const [connectionMessage, setConnectionMessage] = useState('');
  const [sessionReady, setSessionReady] = useState(false);
  const [mediaBrightness, setMediaBrightness] = useState(100);
  const [mediaContrast, setMediaContrast] = useState(100);
  const [mediaSaturation, setMediaSaturation] = useState(100);
  const [mediaSpeed, setMediaSpeed] = useState(1);
  const [mediaZoom, setMediaZoom] = useState(100);
  const [mediaMirror, setMediaMirror] = useState(false);
  const [micEnabled, setMicEnabled] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [micError, setMicError] = useState('');
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const micAudioContextRef = useRef<AudioContext | null>(null);
  const micAnalyserRef = useRef<AnalyserNode | null>(null);
  const micFrameRef = useRef<number | null>(null);
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

  const toggleMicrophone = async () => {
    if (micEnabled) {
      micStreamRef.current?.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
      if (micFrameRef.current) cancelAnimationFrame(micFrameRef.current);
      if (micAudioContextRef.current) await micAudioContextRef.current.close().catch(() => undefined);
      micAudioContextRef.current = null;
      micAnalyserRef.current = null;
      setMicEnabled(false);
      setMicLevel(0);
      addEvent('MIC', 'Microphone stopped by user');
      return;
    }
    setMicError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setMicError('Microphone access is not supported in this browser.');
      addEvent('MIC', 'Microphone API unavailable', 'warning');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      micStreamRef.current = stream;
      const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = .75;
        ctx.createMediaStreamSource(stream).connect(analyser);
        micAudioContextRef.current = ctx;
        micAnalyserRef.current = analyser;
        const data = new Uint8Array(analyser.frequencyBinCount);
        const draw = () => {
          if (!micAnalyserRef.current) return;
          micAnalyserRef.current.getByteFrequencyData(data);
          let sum = 0;
          for (const n of data) sum += n;
          setMicLevel(Math.min(1, (sum / data.length) / 255 * 3));
          micFrameRef.current = requestAnimationFrame(draw);
        };
        draw();
      }
      setMicEnabled(true);
      addEvent('MIC', 'Microphone permission granted and input enabled', 'success');
    } catch (error) {
      setMicError(error instanceof DOMException && error.name === 'NotAllowedError' ? 'Microphone permission was denied.' : 'Microphone could not be started.');
      addEvent('MIC', 'Microphone access was not enabled', 'warning');
    }
  };

  useEffect(() => () => {
    micStreamRef.current?.getTracks().forEach(track => track.stop());
    if (micFrameRef.current) cancelAnimationFrame(micFrameRef.current);
    if (micAudioContextRef.current) micAudioContextRef.current.close().catch(() => undefined);
    if (mediaUrl) URL.revokeObjectURL(mediaUrl);
  }, [mediaUrl]);

  const connectPlatformAccount = async () => {
    if (!destination || destination === 'custom') {
      addEvent('CONNECT', 'Select an account-based platform first', 'warning');
      return;
    }
    setConnectionBusy(true);
    setConnectionMessage('');
    try {
      const response = await fetch('/_api/platform-connect?provider=' + encodeURIComponent(destination));
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || body.message || 'Connection could not be started.');
      if (!body.configured) {
        setConnectionMessage(body.message || 'This provider needs OAuth configuration on the server.');
        addEvent('CONNECT', (platforms.find(p=>p.id===destination)?.name || 'Platform') + ' OAuth is not configured yet', 'warning');
        return;
      }
      addEvent('CONNECT', 'Opening official account authorization for ' + (platforms.find(p=>p.id===destination)?.name || 'platform'));
      window.location.assign(body.authorizationUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Connection could not be started.';
      setConnectionMessage(message);
      addEvent('CONNECT', message, 'warning');
    } finally {
      setConnectionBusy(false);
    }
  };

  const startStream = () => {
    if (!destination) {
      addEvent('STREAM', 'Choose a destination before starting the session', 'warning');
      setDestinationOpen('custom');
      return;
    }
    if (!destinationValue.trim()) {
      addEvent('STREAM', 'Add the destination meeting URL, endpoint or connection reference first', 'warning');
      setDestinationOpen(destination);
      return;
    }
    if (!mediaUrl && !voiceOutputUrl) {
      addEvent('STREAM', 'Load media or generate voice output before starting', 'warning');
      return;
    }
    const next = !streaming;
    setStreaming(next);
    setViewers(0);
    setSessionReady(next);
    addEvent('STREAM', next ? `Session started for ${platforms.find(p=>p.id===destination)?.name || 'destination'}` : 'Session stopped', next ? 'success' : 'info');
  };

  const loadMedia = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      addEvent('MEDIA', 'Please select a video file.', 'warning');
      return;
    }
    if (mediaUrl) URL.revokeObjectURL(mediaUrl);
    const url = URL.createObjectURL(file);
    setMediaUrl(url);
    setMediaName(file.name);
    addEvent('MEDIA', `Loaded media: ${file.name}`, 'success');
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

  useEffect(() => {
    document.querySelectorAll<HTMLVideoElement>('.app video').forEach(video => { video.playbackRate = mediaSpeed; });
  }, [mediaSpeed]);

  const mediaVisualStyle = {
    filter: 'brightness(' + mediaBrightness + '%) contrast(' + mediaContrast + '%) saturate(' + mediaSaturation + '%)',
    transform: 'scale(' + (mediaMirror ? -1 : 1) * (mediaZoom / 100) + ', ' + (mediaZoom / 100) + ')',
    transition: 'filter .18s ease, transform .18s ease'
  } as React.CSSProperties;

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
          <label>SESSION INPUT</label>
          <input value={scenario} onChange={e => setScenario(e.target.value)} placeholder="Name this research session" aria-label="Research session name" />
          <span>Enter your own session context. Nothing is pre-populated or automatically authorized.</span>
        </div>
      </section>

      <nav className="labNav" aria-label="LiveSim workflow">
        <button className={lab==='simulation'?'active':''} onClick={()=>{setLab('simulation');document.getElementById('workspace')?.scrollIntoView({behavior:'smooth',block:'start'})}}>1 · Session</button>
        <button className={lab==='media'?'active':''} onClick={()=>{setLab('media');document.getElementById('mediaLab')?.scrollIntoView({behavior:'smooth',block:'start'})}}>2 · Media</button>
        <button className={lab==='voice'?'active':''} onClick={()=>{setLab('voice');document.getElementById('voiceLab')?.scrollIntoView({behavior:'smooth',block:'start'})}}>3 · Voice</button>
        <button className={destinationOpen?'active':''} onClick={()=>setDestinationOpen(destination || 'custom')}>4 · Destination</button>
        <button className={lab==='forensics'?'active':''} onClick={()=>{setLab('forensics');document.getElementById('eventLog')?.scrollIntoView({behavior:'smooth',block:'start'})}}>5 · Review</button>
      </nav>

      {destinationOpen && <section className="destinationPanel panel">
        <div className="panelHead"><div><p className="eyebrow">CONNECTION HUB</p><h2>Choose where this session goes</h2></div><button className="ghost" onClick={()=>setDestinationOpen('')}>Close</button></div>
        <div className="platformGrid">
          {platforms.map(p=><button key={p.id} className={'platformCard '+(destination===p.id?'selected':'')} onClick={()=>{setDestination(p.id);setDestinationOpen(p.id);setDestinationConnected(false);}}>
            <strong>{p.name}</strong><span>{p.mode}</span><small>{p.availability}</small>
          </button>)}
        </div>
        {destinationOpen && <div className="connectionDetail">
          {(() => { const p=platforms.find(x=>x.id===destinationOpen); if(!p) return null; return <><div><p className="eyebrow">DESTINATION SETUP</p><h3>{p.name}</h3><p>{p.description}</p></div><label>Meeting URL / stream endpoint / connection reference<input value={destinationValue} onChange={e=>setDestinationValue(e.target.value)} placeholder={p.id==='zoom'?'Paste your Zoom meeting URL or integration reference':p.id==='googlemeet'?'Paste your Google Meet URL':'Paste the destination URL or supported endpoint'} /></label><small>Requires: {p.requires}</small><button className="primaryBtn" onClick={()=>{if(!destinationValue.trim()){addEvent('CONNECT',`Add a ${p.name} destination first`,'warning');return;}setDestination(p.id);setDestinationConnected(true);addEvent('CONNECT',`${p.name} destination configured by user`,'success')}}>{destinationConnected && destination===p.id?'DESTINATION READY':'CONFIGURE DESTINATION'}</button>
<button className="outline connectAccountBtn" disabled={connectionBusy || p.id==='custom'} onClick={connectPlatformAccount}>{connectionBusy ? 'OPENING…' : 'CONNECT ACCOUNT'}</button>
{connectionMessage && <small className="connectionMessage">{connectionMessage}</small>}{destinationConnected && destination===p.id && /^https?:\\/\\//i.test(destinationValue) && <button className="outline" onClick={()=>window.open(destinationValue,'_blank','noopener,noreferrer')}>OPEN {p.name.toUpperCase()}</button>}</>})()}
        </div>}
      </section>}

      <section id="workspace" className="workspace">
        <div className="panel media">
          <div className="panelHead">
            <div className="tabs"><button className={tab==='call'?'active':''} onClick={()=>setTab('call')}>Video call</button><button className={tab==='stream'?'active':''} onClick={()=>setTab('stream')}>Livestream</button></div>
            <span className="tag">{tab==='stream' ? 'SIMULATED LIVE' : 'PRE-RECORDED / SYNTHETIC'}</span>
          </div>

          {tab === 'stream' ? (
            <div className="streamStage">
              <div className="stageGrid"/>
              <div className="streamPreview">
                <span className="liveBadge">{streaming ? '● SESSION ACTIVE' : destinationConnected ? 'DESTINATION READY' : 'CHOOSE A DESTINATION'}</span>
                {mediaUrl ? <video src={mediaUrl} controls playsInline style={mediaVisualStyle} onLoadedMetadata={e => { e.currentTarget.playbackRate = mediaSpeed; }} /> : <button className="outline" onClick={() => mediaInputRef.current?.click()}>Load video</button>}
                <b>{mediaName || 'No media loaded'}</b>
                <small>Local media only · simulation label remains visible</small>
                <div className="streamWatermark">LIVE SIM LAB</div>
              </div>
              <div className="streamStats"><span>{streaming ? 'Session connected · audience remains external' : 'No audience connected'}</span><span>{streaming ? 'SESSION ACTIVE' : 'SESSION IDLE'}</span></div>
              {streamVoiceArmed && voiceOutputUrl && <div className="streamAudio"><span>VOICE OUTPUT ARMED · SIMULATION</span><audio controls src={voiceOutputUrl}/></div>}
            </div>
          ) : (
            <div className="stage">
              <div className="stageGrid"/>
              <div className="fakeVideo">
                {mediaUrl ? <video src={mediaUrl} controls playsInline /> : <button className="outline" onClick={() => mediaInputRef.current?.click()}>Load video media</button>}
                <div className="videoLabel"><b>{mediaName || 'No media loaded'}</b><span>Local media · simulation environment</span></div>
                <div className="watermark">SIMULATED</div>
              </div>
              <div className="mediaHud"><span>{playing ? '00:14:28' : '00:09:07'}</span><span>{progress}%</span></div>
            </div>
          )}

          <div className="controls">
            <button className="play" onClick={()=>setPlaying(!playing)}>{playing?'Ⅱ':'▶'}</button>
            <div className="scrub"><span style={{width: progress + '%'}}/></div>
            <span className="mono">{playing ? 'PLAYING' : 'PAUSED'}</span>
            {tab === 'stream' && <button className={streaming ? 'dangerBtn' : 'streamBtn'} onClick={startStream}>{streaming ? 'END SESSION' : 'START SESSION'}</button>}
            <button onClick={()=>addEvent('MEDIA', playing?'Playback paused':'Playback resumed')}>MARK EVENT</button>
          </div>
        </div>

        <aside className="panel participants">
          <div className="panelHead"><h2>Participants</h2><span className="count">{selectedProviderVoiceId ? '01' : '00'}</span></div>
          {selectedProviderVoiceId ? <div className="participant"><span className="avatar small">VC</span><div><b>{voice || 'Authorized voice'}</b><small>authorized voice profile</small></div><span className="state synthetic">ready</span></div> : <div className="empty">No participant configured. Create or select an authorized voice profile to continue.</div>}
          <div className="rule"/>
          <div className="integrity"><span>◉</span><div><b>Integrity lock</b><small>No camera, microphone, wallet or identity data is captured.</small></div></div>
        </aside>
      </section>

      <section id="mediaLab" className="toolsGrid">
        <div className="panel toolPanel mediaStudio">
          <div className="panelHead"><div><p className="eyebrow">MEDIA STUDIO</p><h2>Video controls</h2></div><span className="tag">LOCAL / NON-DESTRUCTIVE</span></div>
          <div className="toolBody">
            <div className="mediaControlGrid">
              <label>Brightness <span>{mediaBrightness}%</span><input type="range" min="50" max="150" value={mediaBrightness} onChange={e=>setMediaBrightness(Number(e.target.value))}/></label>
              <label>Contrast <span>{mediaContrast}%</span><input type="range" min="50" max="150" value={mediaContrast} onChange={e=>setMediaContrast(Number(e.target.value))}/></label>
              <label>Saturation <span>{mediaSaturation}%</span><input type="range" min="0" max="180" value={mediaSaturation} onChange={e=>setMediaSaturation(Number(e.target.value))}/></label>
              <label>Zoom <span>{mediaZoom}%</span><input type="range" min="75" max="140" value={mediaZoom} onChange={e=>setMediaZoom(Number(e.target.value))}/></label>
              <label>Playback speed <span>{mediaSpeed.toFixed(2)}×</span><input type="range" min=".5" max="2" step=".05" value={mediaSpeed} onChange={e=>setMediaSpeed(Number(e.target.value))}/></label>
            </div>
            <div className="mediaActions">
              <button className={mediaMirror ? 'primaryBtn' : 'outline'} onClick={()=>setMediaMirror(v=>!v)}>{mediaMirror ? 'MIRROR ON' : 'MIRROR OFF'}</button>
              <button className="outline" onClick={()=>{setMediaBrightness(100);setMediaContrast(100);setMediaSaturation(100);setMediaSpeed(1);setMediaZoom(100);setMediaMirror(false);addEvent('MEDIA','Video adjustments reset')}}>RESET EDITS</button>
            </div>
            <div className="micPanel">
              <div><p className="eyebrow">MICROPHONE INPUT</p><h3>{micEnabled ? 'Microphone active' : 'Microphone ready'}</h3><small>Permission is requested only when you press the button. LiveSim Lab does not record or upload microphone audio.</small></div>
              <div className="micMeter"><span style={{transform:'scaleX(' + Math.max(.02,micLevel) + ')'}}/></div>
              <button className={micEnabled ? 'dangerBtn' : 'primaryBtn'} onClick={toggleMicrophone}>{micEnabled ? 'TURN MIC OFF' : 'ALLOW MICROPHONE'}</button>
              {micError && <small className="micError">{micError}</small>}
            </div>
            <div className="editNote">These controls change local playback presentation. They do not alter the original video file or make a prerecorded person react to your movement.</div>
          </div>
        </div>

        <div className="panel toolPanel">
          <div className="panelHead"><div><p className="eyebrow">VOICE LAB</p><h2>Voice simulation</h2></div><span className="tag">AUTHORIZED / SYNTHETIC</span></div>
          <div className="toolBody">
            <VoiceOrb level={orbLevel} speaking={orbSpeaking}/>
            <audio ref={audioRef} className="voiceAudioEngine" preload="auto" />
            <label>Voice profile</label>
            <div className="voiceRow"><select value={voice} onChange={e=>{setVoice(e.target.value);const profile=voiceProfiles.find(p=>p.displayName===e.target.value);setSelectedProviderVoiceId(profile?.providerVoiceId ?? '');addEvent('VOICE','Voice profile selected: '+e.target.value)}}><option value="">Select a saved voice</option>{voiceProfiles.map(profile=><option key={profile.id} value={profile.displayName}>{profile.displayName}</option>)}</select><button className="outline" onClick={()=>fileInputRef.current?.click()} disabled={cloning}>{cloning ? 'CLONING…' : 'Upload voice'}</button></div>
            <input ref={fileInputRef} className="hiddenFile" type="file" accept="audio/mpeg,audio/wav,audio/x-wav,audio/flac,audio/mp4,audio/x-m4a,audio/ogg,audio/webm" onChange={e=>cloneVoice(e.target.files?.[0])}/>
            <input ref={mediaInputRef} className="hiddenFile" type="file" accept="video/*" onChange={e=>loadMedia(e.target.files?.[0])}/>
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
            <textarea className="voiceText" value={voiceText} onChange={e=>setVoiceText(e.target.value)} placeholder="Enter the text you want the authorized voice to speak." rows={3}/>
            <div className="voiceActions"><button className="outline" onClick={synthesizeVoice} disabled={synthesizing || !voiceText.trim()}>{synthesizing ? 'GENERATING…' : '▶ Generate speech'}</button><button className="primaryBtn" onClick={()=>{if(!voiceOutputUrl){addEvent('VOICE','Generate a preview before applying output','warning');return;}setStreamVoiceArmed(tab==='stream');addEvent('VOICE','Voice output armed for '+(tab==='stream'?'livestream simulation':'call simulation'),'success')}}>Apply to {tab}</button></div>
            {voiceOutputUrl && <div className="audioPreview"><span>FISH AUDIO OUTPUT · SIMULATED</span><audio controls src={voiceOutputUrl}/></div>}
            <small className="safetyNote">Voice cloning is limited to voices you own or are authorized to use. Generated speech remains marked as simulation.</small>
          </div>
        </div>

        <div className="panel toolPanel">
          <div className="panelHead"><div><p className="eyebrow">LIVE STREAM LAB</p><h2>Audience state</h2></div><span className="tag">NO REAL VIEWERS</span></div>
          <div className="toolBody">
            <div className="metricRow"><div><b>{viewers}</b><small>simulated viewers</small></div><div><b>{eventsShown.length}</b><small>recorded events</small></div><div><b>{streaming ? 'ON' : 'OFF'}</b><small>session state</small></div></div>
            <div className="empty">No audience, chat, reactions or donations are fabricated. Connect a configured research data source later if you need those measurements.</div>
          </div>
        </div>
      </section>

      <section className="lower">
        <div className="panel ledger">
          <div className="panelHead"><div><p className="eyebrow">TRANSACTION INPUT</p><h2>Bitcoin analysis</h2></div><span className="tag yellow">USER PROVIDED</span></div>
          <div className="cloneForm">
            <input value={transactionRef} onChange={e=>setTransactionRef(e.target.value)} placeholder="Synthetic transaction ID or reference" aria-label="Transaction reference"/>
            <input value={transactionAmount} onChange={e=>setTransactionAmount(e.target.value)} placeholder="Amount in BTC (optional)" inputMode="decimal" aria-label="Transaction amount"/>
          </div>
          <div className="tx"><div className="coin">₿</div><div><b>{transactionRef || 'No transaction supplied'}</b><small>LiveSim Lab accepts user-provided synthetic transaction data only.</small></div><strong>{transactionAmount ? transactionAmount + ' BTC' : '—'}</strong></div>
          <button className="outline" disabled={!transactionRef.trim()} onClick={()=>addEvent('BTC','User-provided transaction reference recorded for analysis','warning')}>Record for analysis</button>
        </div>
        <div id="eventLog" className="panel logs">
          <div className="panelHead"><div><p className="eyebrow">EVENT LOG</p><h2>Timeline</h2></div><button className="ghost" onClick={()=>setEventsShown([])}>Clear</button></div>
          <div className="eventList">{eventsShown.length ? eventsShown.map((e,i)=><div className="event" key={i}><time>{e[0]}</time><span className={'eventDot ' + e[3]}/><div><b>{e[1]}</b><span>{e[2]}</span></div></div>) : <div className="empty">No events. Use the console controls to create audit markers.</div>}</div>
        </div>
      </section>

      <footer><span>LiveSim Lab · research console</span><span>SIMULATED MEDIA · SYNTHETIC VOICES · SYNTHETIC BTC · NO REAL TRANSACTIONS</span></footer>
    </main>
    </>
  );
}
