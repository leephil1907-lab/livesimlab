import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle, Camera, CameraOff, Circle, Coins, FlipHorizontal, Info, Maximize2, Mic, MicOff,
  PictureInPicture2, Plus, RefreshCw, Sparkles, Square, Zap,
} from 'lucide-react';
import { ApiError, Link, api, clock, credits as fmtCredits, useApp, useDocumentTitle, useToast } from '../../lib/core.jsx';
import { Modal, Switch, UploadCharacterModal } from '../../components/AppLayout.jsx';

const SEND_INTERVAL_MS = 40; // ~25 fps upper bound; real rate adapts to the engine
const MAX_IN_FLIGHT = 2;

// Timers inside a Worker keep running when the studio tab is in the background
// (e.g. while you're in your calling app), unlike window timers.
function createTicker(ms, fn) {
  const src = `let t=setInterval(()=>postMessage(0),${ms});onmessage=()=>clearInterval(t);`;
  const url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
  const worker = new Worker(url);
  worker.onmessage = fn;
  return () => { worker.postMessage('stop'); worker.terminate(); URL.revokeObjectURL(url); };
}

function pickRecorderType() {
  const types = ['video/mp4;codecs=avc1,mp4a.40.2', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];
  return types.find(t => window.MediaRecorder?.isTypeSupported?.(t)) || '';
}

function drawLabel(ctx, w, h) {
  const s = Math.max(1, w / 1280);
  const pad = 14 * s, fh = 15 * s, bh = 30 * s;
  ctx.font = `600 ${fh}px 'Instrument Sans', system-ui, sans-serif`;
  const text = 'AI video';
  const tw = ctx.measureText(text).width;
  const bw = tw + 34 * s;
  const x = pad, y = h - pad - bh;
  ctx.fillStyle = 'rgba(12,13,14,.62)';
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(x, y, bw, bh, bh / 2) : ctx.rect(x, y, bw, bh);
  ctx.fill();
  ctx.fillStyle = '#8fa9f7';
  ctx.beginPath(); ctx.arc(x + 14 * s, y + bh / 2, 4 * s, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f0f1ee';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + 24 * s, y + bh / 2 + 1);
}

export default function Studio() {
  useDocumentTitle('Studio');
  const { config, user, setUser, refreshUser } = useApp();
  const toast = useToast();

  // camera
  const videoRef = useRef(null);
  const pipRef = useRef(null);
  const streamRef = useRef(null);
  const [camState, setCamState] = useState('off'); // off | starting | on | error
  const [camError, setCamError] = useState('');
  const [devices, setDevices] = useState([]);
  const [deviceId, setDeviceId] = useState(() => localStorage.getItem('fh_cam') || '');
  const [mirror, setMirror] = useState(true);

  // setup
  const [characters, setCharacters] = useState([]);
  const [characterId, setCharacterId] = useState(() => localStorage.getItem('fh_char') || '');
  const [showUpload, setShowUpload] = useState(false);
  const models = config?.models || [];
  const [modelId, setModelId] = useState(() => localStorage.getItem('fh_model') || '');
  const model = models.find(m => m.id === modelId) || models[0];
  const [limitMode, setLimitMode] = useState('300'); // seconds preset or 'all' | 'custom'
  const [customLimit, setCustomLimit] = useState('');
  const [aiLabel, setAiLabel] = useState(true);
  const [mouthMask, setMouthMask] = useState(true);
  const [engine, setEngine] = useState(null);

  // live
  const [phase, setPhase] = useState('idle'); // idle | starting | live | ending
  const [statusMsg, setStatusMsg] = useState('');
  const [session, setSession] = useState(null);
  const [tick, setTick] = useState({ seconds: 0, used: 0, remaining: 0, paused: false });
  const [summary, setSummary] = useState(null);
  const [needCredits, setNeedCredits] = useState(null);
  const wsRef = useRef(null);
  const stopTickerRef = useRef(null);
  const inFlightRef = useRef(0);
  const outRef = useRef(null);
  const captureRef = useRef(null);
  const popupRef = useRef(null);
  const aiLabelRef = useRef(aiLabel);
  const endedRef = useRef(false);
  const [popupOpen, setPopupOpen] = useState(false);
  const [fps, setFps] = useState(0);
  const framesRef = useRef(0);

  // recording
  const recorderRef = useRef(null);
  const micStreamRef = useRef(null);
  const [recording, setRecording] = useState(false);
  const [recStart, setRecStart] = useState(0);
  const [micOn, setMicOn] = useState(true);
  const [, force] = useState(0);

  useEffect(() => { aiLabelRef.current = aiLabel; }, [aiLabel]);
  useEffect(() => { if (model) localStorage.setItem('fh_model', model.id); }, [model]);
  useEffect(() => { if (characterId) localStorage.setItem('fh_char', characterId); }, [characterId]);

  // ───── data ─────
  const loadCharacters = useCallback(async () => {
    try {
      const { characters } = await api('/characters');
      setCharacters(characters);
      setCharacterId(id => (characters.some(c => c.id === id) ? id : characters[0]?.id || ''));
    } catch (err) { toast(err.message, 'error'); }
  }, [toast]);
  const loadEngine = useCallback(async (refresh = false) => {
    try { setEngine(await api(`/live/engine${refresh ? '?refresh=1' : ''}`)); } catch { setEngine({ available: false, detail: 'Could not check the live engine.' }); }
  }, []);
  useEffect(() => { loadCharacters(); loadEngine(); }, [loadCharacters, loadEngine]);

  // ───── camera ─────
  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCamState('off');
  }, []);
  const startCamera = useCallback(async (id = deviceId) => {
    if (!navigator.mediaDevices?.getUserMedia) { setCamState('error'); setCamError('This browser can’t access cameras. Try Chrome or Edge on a computer.'); return; }
    setCamState('starting'); setCamError('');
    streamRef.current?.getTracks().forEach(t => t.stop());
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { ...(id ? { deviceId: { exact: id } } : {}), width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play().catch(() => {}); }
      if (pipRef.current) { pipRef.current.srcObject = stream; pipRef.current.play().catch(() => {}); }
      const list = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'videoinput');
      setDevices(list);
      const active = stream.getVideoTracks()[0]?.getSettings().deviceId || '';
      setDeviceId(active); localStorage.setItem('fh_cam', active);
      stream.getVideoTracks()[0].onended = () => { setCamState('error'); setCamError('Your camera was disconnected.'); };
      setCamState('on');
    } catch (err) {
      if (id && err.name === 'OverconstrainedError') return startCamera('');
      setCamState('error');
      setCamError(
        err.name === 'NotAllowedError' ? 'Camera access was blocked. Click the camera icon in your address bar, allow access, then try again.'
          : err.name === 'NotFoundError' ? 'No camera found. Connect a webcam and try again.'
            : err.name === 'NotReadableError' ? 'Your camera is being used by another app. Close it and try again.'
              : err.message || 'Could not start the camera.',
      );
    }
  }, [deviceId]);

  // Auto-start when permission was granted before.
  useEffect(() => {
    let cancelled = false;
    navigator.permissions?.query({ name: 'camera' }).then(p => { if (!cancelled && p.state === 'granted') startCamera(); }).catch(() => {});
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the PiP fed when it mounts after going live.
  useEffect(() => {
    if (pipRef.current && streamRef.current && pipRef.current.srcObject !== streamRef.current) {
      pipRef.current.srcObject = streamRef.current; pipRef.current.play().catch(() => {});
    }
  });

  // ───── credit limit ─────
  const rate = model?.creditsPerSecond || 1;
  const balance = user?.credits || 0;
  const minCredits = Math.ceil(rate * 5);
  const limitCredits = useMemo(() => {
    if (limitMode === 'all') return Math.floor(balance);
    if (limitMode === 'custom') return Math.floor(Number(customLimit) || 0);
    return Math.ceil(Number(limitMode) * rate);
  }, [limitMode, customLimit, balance, rate]);
  const effectiveLimit = Math.min(limitCredits, Math.floor(balance));
  const maxSeconds = Math.floor(effectiveLimit / rate);

  // ───── live session ─────
  const sendFrame = useCallback(() => {
    const ws = wsRef.current, video = videoRef.current;
    if (!ws || ws.readyState !== 1 || !video || video.readyState < 2 || inFlightRef.current >= MAX_IN_FLIGHT) return;
    const width = Math.min(model?.profile?.width || 960, video.videoWidth || 960);
    const height = Math.round(width * (video.videoHeight / video.videoWidth || 9 / 16));
    let canvas = captureRef.current;
    if (!canvas) canvas = captureRef.current = document.createElement('canvas');
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
    canvas.getContext('2d').drawImage(video, 0, 0, width, height);
    inFlightRef.current += 1;
    canvas.toBlob(blob => {
      if (!blob || ws.readyState !== 1) { inFlightRef.current = Math.max(0, inFlightRef.current - 1); return; }
      blob.arrayBuffer().then(buf => ws.send(buf));
    }, 'image/jpeg', model?.profile?.quality || 0.8);
  }, [model]);

  const drawOutput = useCallback(async data => {
    inFlightRef.current = Math.max(0, inFlightRef.current - 1);
    framesRef.current += 1;
    const canvas = outRef.current;
    if (!canvas) return;
    const bitmap = await createImageBitmap(new Blob([data], { type: 'image/jpeg' }));
    if (canvas.width !== bitmap.width || canvas.height !== bitmap.height) { canvas.width = bitmap.width; canvas.height = bitmap.height; }
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close?.();
    if (aiLabelRef.current) drawLabel(ctx, canvas.width, canvas.height);
    const popup = popupRef.current;
    if (popup && !popup.closed) {
      const copy = await createImageBitmap(canvas);
      popup.postMessage({ type: 'frame', bitmap: copy }, window.location.origin, [copy]);
    }
  }, []);

  const teardown = useCallback(() => {
    stopTickerRef.current?.(); stopTickerRef.current = null;
    const ws = wsRef.current; wsRef.current = null;
    if (ws && ws.readyState <= 1) { ws.onclose = null; ws.close(); }
    inFlightRef.current = 0;
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    popupRef.current?.postMessage({ type: 'idle' }, window.location.origin);
  }, []);

  const handleEnded = useCallback(msg => {
    endedRef.current = true;
    teardown();
    setPhase('idle'); setStatusMsg('');
    if (msg.user) setUser(msg.user); else refreshUser();
    if (msg.session) setSummary({ ...msg.session, reason: msg.reason, message: msg.message });
    if (msg.reason === 'engine_error') toast(msg.message || 'The live engine stopped unexpectedly.', 'error');
  }, [teardown, setUser, refreshUser, toast]);

  const goLive = async () => {
    if (camState !== 'on') return toast('Turn on your camera first.', 'error');
    if (!characterId) return toast('Pick a character first.', 'error');
    setPhase('starting'); setStatusMsg('Reserving credits…'); endedRef.current = false;
    let started;
    try {
      started = await api('/live/start', { method: 'POST', body: { characterId, model: model.id, creditLimit: effectiveLimit } });
    } catch (err) {
      setPhase('idle'); setStatusMsg('');
      if (err instanceof ApiError && err.status === 402) setNeedCredits(err.message);
      else toast(err.message, 'error');
      return;
    }
    setUser(started.user);
    setSession(started);
    setTick({ seconds: 0, used: 0, remaining: started.reserved, paused: false });
    setStatusMsg('Connecting to the live engine…');
    const ws = new WebSocket(`${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws/live?session=${encodeURIComponent(started.sessionId)}`);
    ws.binaryType = 'arraybuffer';
    wsRef.current = ws;
    ws.onmessage = ev => {
      if (typeof ev.data !== 'string') return drawOutput(ev.data);
      const msg = JSON.parse(ev.data);
      if (msg.type === 'status') setStatusMsg(msg.message);
      else if (msg.type === 'ready') {
        setPhase('live'); setStatusMsg('');
        ws.send(JSON.stringify({ type: 'settings', mouthMask }));
        stopTickerRef.current = createTicker(SEND_INTERVAL_MS, sendFrame);
      } else if (msg.type === 'tick') setTick(msg);
      else if (msg.type === 'ended') handleEnded(msg);
      else if (msg.type === 'notice') toast(msg.message);
      else if (msg.type === 'character') toast('Character switched.', 'success');
    };
    ws.onclose = async () => {
      if (endedRef.current) return;
      teardown();
      setPhase('idle'); setStatusMsg('');
      try {
        const res = await api(`/live/${started.sessionId}/stop`, { method: 'POST' });
        setUser(res.user); setSummary({ ...res.session, reason: 'disconnected' });
      } catch { refreshUser(); }
      toast('The live connection dropped. Unused credits were returned to your wallet.', 'error');
    };
  };

  const stopLive = () => {
    if (!session) return;
    setPhase('ending'); setStatusMsg('Stopping…');
    const ws = wsRef.current;
    if (ws?.readyState === 1) ws.send(JSON.stringify({ type: 'stop' }));
    setTimeout(async () => {
      if (endedRef.current) return;
      endedRef.current = true;
      teardown();
      try { const res = await api(`/live/${session.sessionId}/stop`, { method: 'POST' }); setUser(res.user); setSummary(res.session); } catch { refreshUser(); }
      setPhase('idle'); setStatusMsg('');
    }, 4000);
  };

  // Live changes during a take.
  useEffect(() => {
    if (phase === 'live' && wsRef.current?.readyState === 1) wsRef.current.send(JSON.stringify({ type: 'settings', mouthMask }));
  }, [mouthMask]); // eslint-disable-line react-hooks/exhaustive-deps
  const chooseCharacter = id => {
    setCharacterId(id);
    if (phase === 'live' && wsRef.current?.readyState === 1) wsRef.current.send(JSON.stringify({ type: 'character', characterId: id }));
  };

  // fps meter
  useEffect(() => {
    if (phase !== 'live') return;
    const t = setInterval(() => { setFps(framesRef.current); framesRef.current = 0; }, 1000);
    return () => clearInterval(t);
  }, [phase]);

  // Clean up on leave; warn before closing during a take.
  useEffect(() => {
    const warn = e => { if (wsRef.current) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => { window.removeEventListener('beforeunload', warn); teardown(); stopCamera(); popupRef.current?.close(); };
  }, [teardown, stopCamera]);

  // ───── pop-out + fullscreen ─────
  const openPopup = () => {
    if (popupRef.current && !popupRef.current.closed) { popupRef.current.focus(); return; }
    const w = window.open('/output', 'fh-output', 'popup,width=1280,height=720');
    if (!w) return toast('Allow pop-ups for this site to open the output window.', 'error');
    popupRef.current = w; setPopupOpen(true);
    const t = setInterval(() => { if (w.closed) { clearInterval(t); setPopupOpen(false); popupRef.current = null; } }, 1000);
  };
  const fullscreen = () => (phase === 'live' ? outRef.current : videoRef.current)?.parentElement?.requestFullscreen?.();

  // ───── recording ─────
  const startRecording = async () => {
    const canvas = outRef.current;
    if (!canvas?.captureStream || !window.MediaRecorder) return toast('Recording isn’t supported in this browser. Try Chrome or Edge.', 'error');
    const stream = canvas.captureStream(30);
    if (micOn) {
      try {
        micStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
        micStreamRef.current.getAudioTracks().forEach(t => stream.addTrack(t));
      } catch { toast('Microphone unavailable — recording video only.'); }
    }
    const mimeType = pickRecorderType();
    const rec = new MediaRecorder(stream, mimeType ? { mimeType, videoBitsPerSecond: 5_000_000 } : undefined);
    const chunks = [];
    rec.ondataavailable = e => e.data.size && chunks.push(e.data);
    rec.onstop = () => {
      micStreamRef.current?.getTracks().forEach(t => t.stop()); micStreamRef.current = null;
      setRecording(false);
      if (!chunks.length) return;
      const type = rec.mimeType || 'video/webm';
      const blob = new Blob(chunks, { type });
      const a = document.createElement('a');
      const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
      a.href = URL.createObjectURL(blob);
      a.download = `facehub-take-${stamp}.${type.includes('mp4') ? 'mp4' : 'webm'}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 30_000);
      toast('Recording saved to your downloads.', 'success');
    };
    rec.start(1000);
    recorderRef.current = rec;
    setRecording(true); setRecStart(Date.now());
  };
  const stopRecording = () => recorderRef.current?.state === 'recording' && recorderRef.current.stop();
  useEffect(() => { if (!recording) return; const t = setInterval(() => force(n => n + 1), 1000); return () => clearInterval(t); }, [recording]);

  // ───── render ─────
  const live = phase === 'live';
  const busy = phase === 'starting' || phase === 'ending';
  const canGoLive = camState === 'on' && characterId && engine?.available && balance >= minCredits && effectiveLimit >= minCredits;
  const progress = session ? Math.min(100, (tick.used / session.reserved) * 100) : 0;
  const selectedChar = characters.find(c => c.id === characterId);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Studio</h1>
          <p>Preview is free. Credits are only used while you’re live.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {engine && (
            <span className={`badge ${engine.available ? (engine.mode === 'test' ? 'info' : 'ok') : 'warn'}`} title={engine.detail}>
              <span className="live-dot" style={{ background: engine.available ? undefined : '#c98a12' }} />
              {engine.available ? (engine.mode === 'test' ? 'Test engine' : 'Engine online') : 'Engine offline'}
            </span>
          )}
          <Link to="/billing" className="credits-pill"><Coins /> {fmtCredits(balance)} credits</Link>
        </div>
      </div>

      <div className="studio">
        <div className="stage-wrap">
          <div className="stage">
            <video ref={videoRef} className={mirror ? 'mirror' : ''} muted playsInline style={{ visibility: live ? 'hidden' : 'visible' }} />
            <canvas ref={outRef} style={{ visibility: live ? 'visible' : 'hidden' }} aria-label="Live AI output" />

            {camState !== 'on' && !live && (
              <div className="stage-empty">
                <div>
                  <span className="icon-ring">{camState === 'error' ? <CameraOff /> : <Camera />}</span>
                  <h2>{camState === 'error' ? 'Camera unavailable' : 'Turn on your camera'}</h2>
                  <p>{camState === 'error' ? camError : 'Your preview stays private on this device. Nothing is broadcast and no credits are used.'}</p>
                  <button className="btn btn-primary" onClick={() => startCamera()} disabled={camState === 'starting'}>
                    {camState === 'starting' ? <span className="spinner" /> : <><Camera size={17} /> {camState === 'error' ? 'Try again' : 'Enable camera'}</>}
                  </button>
                </div>
              </div>
            )}

            {camState === 'on' && !live && !busy && <div className="stage-guide" aria-hidden="true"><i /></div>}

            <div className="stage-top">
              <span>
                {live ? <span className="stage-pill live"><span className="live-dot" /> LIVE <span className="mono">{clock(tick.seconds)}</span></span>
                  : camState === 'on' ? <span className="stage-pill"><span className="live-dot" /> Free preview</span> : null}
              </span>
              <span style={{ display: 'flex', gap: 8 }}>
                {recording && <span className="stage-pill rec"><Circle size={10} fill="currentColor" /> REC <span className="mono">{clock((Date.now() - recStart) / 1000)}</span></span>}
                {live && <span className="stage-pill"><span className="mono">{fps} fps</span></span>}
                {live && tick.paused && <span className="stage-pill">Paused · waiting for frames</span>}
              </span>
            </div>

            {live && <div className="stage-pip"><span>YOU</span><video ref={pipRef} muted playsInline style={mirror ? { transform: 'scaleX(-1)' } : undefined} /></div>}
            {busy && <div className="stage-busy"><div><span className="spinner" /> {statusMsg || 'Working…'}</div></div>}
          </div>

          <div className="controls">
            {devices.length > 1 && (
              <select className="select" value={deviceId} onChange={e => startCamera(e.target.value)} aria-label="Camera" disabled={live || busy}>
                {devices.map((d, i) => <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${i + 1}`}</option>)}
              </select>
            )}
            <button className={`icon-btn${camState === 'on' ? ' on' : ''}`} onClick={() => (camState === 'on' ? stopCamera() : startCamera())} disabled={live || busy} title={camState === 'on' ? 'Turn camera off' : 'Turn camera on'} aria-label="Toggle camera">
              {camState === 'on' ? <Camera /> : <CameraOff />}
            </button>
            <button className={`icon-btn${mirror ? ' on' : ''}`} onClick={() => setMirror(m => !m)} title="Mirror preview (your output is never mirrored)" aria-label="Mirror preview"><FlipHorizontal /></button>
            <button className={`icon-btn${micOn ? ' on' : ''}`} onClick={() => setMicOn(m => !m)} disabled={recording} title={micOn ? 'Microphone will be recorded' : 'Recording without microphone'} aria-label="Toggle microphone for recording">{micOn ? <Mic /> : <MicOff />}</button>
            <button className={`icon-btn${recording ? ' danger' : ''}`} onClick={recording ? stopRecording : startRecording} disabled={!live} title={live ? (recording ? 'Stop recording' : 'Record live output') : 'Go live to record'} aria-label="Record">
              {recording ? <Square /> : <Circle />}
            </button>
            <button className={`icon-btn${popupOpen ? ' on' : ''}`} onClick={openPopup} title="Pop out output window (share it in calls or capture in OBS)" aria-label="Pop out output"><PictureInPicture2 /></button>
            <button className="icon-btn" onClick={fullscreen} title="Full screen" aria-label="Full screen"><Maximize2 /></button>
            <span className="spacer" />
            {live || phase === 'ending' ? (
              <button className="go-btn stop" onClick={stopLive} disabled={phase === 'ending'}><Square /> Stop <small>{fmtCredits(tick.used)} used</small></button>
            ) : balance < minCredits ? (
              <Link to="/billing" className="go-btn"><Coins /> Buy credits to go live</Link>
            ) : (
              <button className="go-btn" onClick={goLive} disabled={!canGoLive || busy} title={!engine?.available ? engine?.detail : undefined}>
                {busy ? <span className="spinner" /> : <Zap />} Go live <small>{model ? `${model.creditsPerSecond}/s` : ''}</small>
              </button>
            )}
          </div>

          {(live || phase === 'ending') && session && (
            <div className="meter">
              <div><span>Live time</span><strong>{clock(tick.seconds)}</strong></div>
              <div><span>Credits used</span><strong>{fmtCredits(tick.used)}</strong></div>
              <div><span>Left in this take</span><strong>{fmtCredits(tick.remaining)}</strong></div>
              <div className="meter-bar"><i style={{ width: `${progress}%` }} /></div>
            </div>
          )}

          {engine && !engine.available && (
            <div className="notice warn"><AlertTriangle /> <span><b>Live generation is unavailable right now.</b> {engine.detail} {user?.isAdmin && <>See <code>README.md → GPU worker</code>.</>} <button className="text-link" style={{ background: 'none', border: 0, color: 'inherit', cursor: 'pointer', padding: 0 }} onClick={() => loadEngine(true)}><RefreshCw size={13} /> Re-check</button></span></div>
          )}
          {engine?.mode === 'test' && (
            <div className="notice info"><Info /> <span><b>Test engine active.</b> Frames pass through unchanged so you can verify credits, recording and the output window end-to-end. Connect a GPU worker for real AI transformation.</span></div>
          )}
        </div>

        <aside>
          <section className="panel">
            <div className="panel-title"><h2>Character</h2><span>{selectedChar?.name || 'None selected'}</span></div>
            <div className="char-grid">
              <button className="char char-add" onClick={() => setShowUpload(true)}><Plus /> Upload</button>
              {characters.map(c => (
                <button key={c.id} className={`char${c.id === characterId ? ' selected' : ''}`} onClick={() => chooseCharacter(c.id)} aria-pressed={c.id === characterId} title={c.name}>
                  <img src={c.image} alt="" loading="lazy" />
                  <span>{c.name}</span>
                </button>
              ))}
            </div>
            {live && <p className="muted" style={{ fontSize: 12.5, marginTop: 10 }}>Tap another character to switch mid-take.</p>}
          </section>

          <section className="panel">
            <div className="panel-title"><h2>Model</h2></div>
            <div className="model-opts" role="radiogroup">
              {models.map(m => (
                <label key={m.id} className={`model-opt${m.id === model?.id ? ' selected' : ''}`}>
                  <input type="radio" name="model" checked={m.id === model?.id} onChange={() => setModelId(m.id)} disabled={live || busy} />
                  <div><b>{m.name} <em>{m.creditsPerSecond} credit{m.creditsPerSecond === 1 ? '' : 's'}/sec</em></b><p>{m.description}</p></div>
                </label>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="panel-title"><h2>Credit limit for this take</h2><span className="tabular">{fmtCredits(effectiveLimit)} cr · {clock(maxSeconds)}</span></div>
            <div className="limit-row">
              {[['60', '1 min'], ['300', '5 min'], ['900', '15 min'], ['all', 'All credits'], ['custom', 'Custom']].map(([v, label]) => (
                <button key={v} className={`chip${limitMode === v ? ' on' : ''}`} onClick={() => setLimitMode(v)} disabled={live || busy}>{label}</button>
              ))}
            </div>
            {limitMode === 'custom' && (
              <input className="input" style={{ marginTop: 10, height: 42 }} type="number" min={minCredits} placeholder={`Credits (min ${minCredits})`} value={customLimit} onChange={e => setCustomLimit(e.target.value)} disabled={live || busy} />
            )}
            <p className="muted" style={{ fontSize: 12.5, marginTop: 10 }}>Credits are reserved when you go live. Stop early and the unused part returns to your wallet.</p>
          </section>

          <section className="panel">
            <div className="toggle-row"><div>AI video label<small>Shows “AI video” on your output and recordings</small></div><Switch checked={aiLabel} onChange={setAiLabel} label="AI video label" /></div>
            <div className="toggle-row"><div>Keep my mouth<small>Preserves your real mouth movement for natural speech</small></div><Switch checked={mouthMask} onChange={setMouthMask} label="Keep my mouth" /></div>
          </section>

          <div className="notice" style={{ marginTop: 16 }}><Sparkles /> <span>Use portraits you have permission to use, and let people know your video is AI-transformed.</span></div>
        </aside>
      </div>

      {showUpload && <UploadCharacterModal onClose={() => setShowUpload(false)} onCreated={c => { setCharacters(list => [c, ...list]); chooseCharacter(c.id); }} />}

      {summary && (
        <Modal
          title={summary.reason === 'limit' ? 'Credit limit reached' : 'Take finished'}
          description={summary.reason === 'limit' ? 'Your take stopped at the credit limit you set.' : summary.message || 'Here’s what this take used.'}
          onClose={() => setSummary(null)}
          actions={<><Link to="/billing" className="btn btn-ghost">View history</Link><button className="btn btn-primary" onClick={() => setSummary(null)}>Done</button></>}
        >
          <div className="summary-grid">
            <div><span>Live time</span><strong>{clock(summary.billedSeconds)}</strong></div>
            <div><span>Used</span><strong>{fmtCredits(summary.charged)}</strong></div>
            <div><span>Returned</span><strong>{fmtCredits(summary.reserved - summary.charged)}</strong></div>
          </div>
        </Modal>
      )}

      {needCredits && (
        <Modal title="Top up to go live" description={needCredits} onClose={() => setNeedCredits(null)}
          actions={<><button className="btn btn-ghost" onClick={() => setNeedCredits(null)}>Not now</button><Link to="/billing" className="btn btn-primary"><Coins size={16} /> Buy credits</Link></>} />
      )}
    </>
  );
}
