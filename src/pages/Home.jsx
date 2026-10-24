import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ArrowDown, ArrowRight, Check, ChevronRight, Circle, Download, Film, Globe, PictureInPicture2, ShieldCheck, Sparkles, Wallet, Zap,
} from 'lucide-react';
import { Link, credits as fmtCredits, useApp, useDocumentTitle } from '../lib/core.jsx';
import { LogoMark } from '../components/Layout.jsx';
import { ScrollTrigger, Split, gsap, prefersReducedMotion, scrollToTarget, useMotion } from '../lib/motion.jsx';

const CHARACTERS = [
  { name: 'Amara', src: '/characters/amara.webp' },
  { name: 'Kofi', src: '/characters/kofi.webp' },
  { name: 'Nova', src: '/characters/nova.webp' },
];

// ───────────────────────── Hero ─────────────────────────
function Hero() {
  const { user, config } = useApp();
  const sectionRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const [active, setActive] = useState(0);
  const [mode, setMode] = useState('loading'); // loading | webgl | fallback

  useEffect(() => {
    let disposed = false;
    let trigger;
    import('../three/scenes.js').then(({ HoloFaceScene, webglAvailable }) => {
      if (disposed) return;
      if (!webglAvailable()) { setMode('fallback'); return; }
      try {
        sceneRef.current = new HoloFaceScene(canvasRef.current, {
          images: CHARACTERS.map(c => c.src),
          onChange: setActive,
          onReady: err => setMode(err ? 'fallback' : 'webgl'),
        });
        trigger = ScrollTrigger.create({
          trigger: sectionRef.current, start: 'top top', end: 'bottom top',
          onUpdate: self => sceneRef.current?.setScroll(self.progress),
        });
      } catch { setMode('fallback'); }
    }).catch(() => setMode('fallback'));
    return () => { disposed = true; trigger?.kill(); sceneRef.current?.dispose(); sceneRef.current = null; };
  }, []);

  // Fallback slideshow keeps chips meaningful without WebGL.
  useEffect(() => {
    if (mode !== 'fallback' || prefersReducedMotion()) return undefined;
    const t = setInterval(() => setActive(a => (a + 1) % CHARACTERS.length), 4600);
    return () => clearInterval(t);
  }, [mode]);

  useLayoutEffect(() => {
    if (prefersReducedMotion()) return undefined;
    const ctx = gsap.context(() => {
      gsap.timeline({ defaults: { ease: 'expo.out', duration: 1.3 } })
        .from('.hero-kicker', { y: 24, opacity: 0 }, 0.15)
        .from('.hero h1 .split-word > span', { yPercent: 115, rotate: 5, stagger: 0.07 }, 0.2)
        .from('.hero-lede, .hero-actions, .hero-chips', { y: 30, opacity: 0, stagger: 0.08 }, 0.55)
        .from('.hud', { opacity: 0, scale: 0.96, duration: 1.6 }, 0.6);
      gsap.to('.hero-copy', { yPercent: -18, opacity: 0, ease: 'none', scrollTrigger: { trigger: sectionRef.current, start: 'top top', end: 'bottom top', scrub: true } });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  const pick = i => { setActive(i); sceneRef.current?.setCharacter(i); };
  const winUrl = config?.links?.windowsApp;

  return (
    <section className="hero" ref={sectionRef} aria-labelledby="hero-title">
      <div className="hero-canvas" ref={canvasRef} aria-hidden="true">
        {mode === 'fallback' && (
          <div className="hero-fallback">
            {CHARACTERS.map((c, i) => <img key={c.src} src={c.src} alt="" className={i === active ? 'on' : ''} />)}
          </div>
        )}
      </div>
      <div className="hero-shade" aria-hidden="true" />

      <div className="hud" aria-hidden="true">
        <span className="hud-corner tl" /><span className="hud-corner tr" /><span className="hud-corner bl" /><span className="hud-corner br" />
        <span className="hud-label top"><span className="live-dot" /> LIVE · AI VIDEO</span>
        <span className="hud-label bottom">CHARACTER / {CHARACTERS[active].name.toUpperCase()}</span>
      </div>

      <div className="shell hero-inner">
        <div className="hero-copy">
          <p className="hero-kicker"><Sparkles size={14} /> Real-time AI character studio</p>
          <Split as="h1" manual id="hero-title" lines={['A new face.', { text: 'Same you.', className: 'dim' }]} />
          <p className="hero-lede">Your expressions. Your movement. A whole new character — for comedy, creative livestreams and calls where everyone knows it’s AI.</p>
          <div className="hero-actions">
            <Link to={user ? '/studio' : '/register'} className="btn btn-glow btn-lg">{user ? 'Open your studio' : 'Start free preview'} <ArrowRight /></Link>
            {winUrl
              ? <a href={winUrl} className="btn btn-glass btn-lg"><Download /> Windows app</a>
              : <Link to="/pricing" className="btn btn-glass btn-lg">See pricing</Link>}
          </div>
          <div className="hero-chips" role="group" aria-label="Preview a character">
            {CHARACTERS.map((c, i) => (
              <button key={c.name} className={`chip-char${i === active ? ' on' : ''}`} onClick={() => pick(i)} aria-pressed={i === active}>
                <img src={c.src} alt="" /> {c.name}
              </button>
            ))}
            <span className="chips-note">Free camera preview · Pay in naira</span>
          </div>
        </div>
      </div>
      <button className="scroll-cue" onClick={() => scrollToTarget('#experience', 0)} aria-label="Scroll to explore">
        <span>Scroll</span><ArrowDown size={14} />
      </button>
    </section>
  );
}

function Marquee() {
  const items = ['Real-time AI', 'No install', 'Free camera preview', 'Pay in naira', 'Built-in recording', 'Switch characters live', 'AI-video label', 'Per-second billing'];
  const row = items.map((t, i) => <span key={i}>{t}<i /></span>);
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee-track">{row}{row}</div>
    </div>
  );
}

// ───────────────────────── Pinned scroll story ─────────────────────────
const STEPS = [
  { k: '01', title: 'Pick your character.', body: 'Try a sample or upload a portrait you have permission to use. One clear photo is all it takes.' },
  { k: '02', title: 'Preview. Then go live.', body: 'Check your camera, light and framing for free. Start live generation only when you’re ready.' },
  { k: '03', title: 'Bring it to your call.', body: 'Your expressions drive the character in real time. Record it, or pop it out into your calling or streaming app.' },
];

function Experience() {
  const ref = useRef(null);
  const [step, setStep] = useState(0);
  const [live, setLive] = useState({ s: 0, c: 0 });
  const stepRef = useRef(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (prefersReducedMotion()) return undefined;
    const ctx = gsap.context(() => {
      gsap.timeline({
        scrollTrigger: {
          trigger: el, start: 'top top', end: 'bottom bottom', scrub: 0.7,
          onUpdate: self => {
            const p = self.progress;
            const s = p < 0.34 ? 0 : p < 0.67 ? 1 : 2;
            if (s !== stepRef.current) { stepRef.current = s; setStep(s); }
            const secs = Math.max(0, Math.round(((p - 0.67) / 0.33) * 42));
            setLive(prev => (prev.s === secs ? prev : { s: secs, c: secs }));
            el.style.setProperty('--xp', p.toFixed(4));
          },
        },
      })
        .fromTo('.xp-device', { rotateX: 24, rotateY: -30, rotateZ: 4, scale: 0.84 }, { rotateX: 10, rotateY: -14, rotateZ: 1, scale: 0.94, ease: 'none', duration: 0.4 })
        .to('.xp-device', { rotateX: 0, rotateY: 0, rotateZ: 0, scale: 1, ease: 'none', duration: 0.6 })
        .fromTo('.xp-glow', { opacity: 0.3, scale: 0.8 }, { opacity: 1, scale: 1.15, ease: 'none', duration: 1 }, 0);
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <section className="xp" id="experience" ref={ref} data-step={step} aria-labelledby="xp-title">
      <div className="xp-sticky">
        <div className="shell xp-grid">
          <div className="xp-text">
            <p className="kicker">From portrait to video call</p>
            <h2 id="xp-title">Less setup.<br /><span className="dim">More you.</span></h2>
            <ol className="xp-steps">
              {STEPS.map((s, i) => (
                <li key={s.k} className={i === step ? 'on' : i < step ? 'done' : ''}>
                  <span className="xp-k">{s.k}</span>
                  <div><h3>{s.title}</h3><p>{s.body}</p></div>
                </li>
              ))}
            </ol>
            <div className="xp-progress"><i /></div>
          </div>

          <div className="xp-stage" aria-hidden="true">
            <div className="xp-glow" />
            <div className="xp-device">
              <div className="xp-bar"><span className="dots"><i /><i /><i /></span><span>Studio</span><span className="mono">{step === 2 ? `00:${String(live.s).padStart(2, '0')}` : '00:00'}</span></div>
              <div className="xp-screen">
                {/* step 1: choose */}
                <div className="xp-layer xp-empty">
                  <span className="slot"><Sparkles size={18} /></span>
                  <span>Choose a character</span>
                </div>
                {/* step 2: camera preview */}
                <div className="xp-layer xp-preview">
                  <svg viewBox="0 0 200 150" className="xp-person"><circle cx="100" cy="62" r="26" /><path d="M44 150c4-30 28-48 56-48s52 18 56 48z" /><ellipse className="xp-oval" cx="100" cy="60" rx="36" ry="45" /></svg>
                  <span className="xp-scan" />
                  <span className="xp-pill"><span className="live-dot" /> Free preview · 0 credits</span>
                </div>
                {/* step 3: live output */}
                <div className="xp-layer xp-live">
                  <img src={CHARACTERS[0].src} alt="" />
                  <span className="xp-pill live"><span className="live-dot" /> LIVE</span>
                  <span className="xp-meter mono">{fmtCredits(live.c)} credits used</span>
                  <span className="xp-label"><i /> AI video</span>
                  <span className="xp-pip"><svg viewBox="0 0 200 150"><circle cx="100" cy="62" r="26" /><path d="M44 150c4-30 28-48 56-48s52 18 56 48z" /></svg><b>YOU</b></span>
                </div>
              </div>
            </div>
            <div className="xp-pick">
              {CHARACTERS.map((c, i) => <img key={c.name} src={c.src} alt="" className={`xp-card c${i}`} />)}
            </div>
            <div className="xp-float f1"><Check size={14} /> Expressions tracked</div>
            <div className="xp-float f2"><Zap size={14} /> 1 credit / sec</div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ───────────────────────── Features bento ─────────────────────────
function Bento() {
  return (
    <section className="section shell" aria-labelledby="bento-title">
      <div className="section-heading">
        <div>
          <p className="kicker" data-reveal>The full studio</p>
          <Split id="bento-title" lines={['All the tools.', { text: 'Every pack.', className: 'dim' }]} />
        </div>
        <p data-reveal>Everything you need to rehearse, perform and record — with a clear meter, so you always know where your credits go.</p>
      </div>
      <div className="bento" data-reveal-group>
        <article className="glass bento-a" data-tilt="4">
          <div className="glass-spot" />
          <span className="pill-icon"><Zap /></span>
          <h3>Real-time, frame by frame</h3>
          <p>Your camera streams to our GPU engine and comes back as your character — expressions, blinks and head turns included.</p>
          <div className="viz-frames" aria-hidden="true">{Array.from({ length: 28 }, (_, i) => <i key={i} style={{ animationDelay: `${i * 0.07}s` }} />)}</div>
        </article>
        <article className="glass bento-b" data-tilt="6">
          <div className="glass-spot" />
          <span className="pill-icon"><Sparkles /></span>
          <h3>Switch characters mid-take</h3>
          <p>Tap a new face without stopping.</p>
          <div className="viz-carousel" aria-hidden="true"><div className="ring">{CHARACTERS.map((c, i) => <img key={c.name} src={c.src} alt="" style={{ '--i': i }} />)}</div></div>
        </article>
        <article className="glass bento-c" data-tilt="6">
          <div className="glass-spot" />
          <span className="pill-icon"><Wallet /></span>
          <h3>A meter you control</h3>
          <p>Set a limit per take. Unused credits return instantly.</p>
          <div className="viz-ring" aria-hidden="true">
            <svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="50" /><circle cx="60" cy="60" r="50" className="arc" /></svg>
            <span><b>1s</b>billing</span>
          </div>
        </article>
        <article className="glass bento-d" data-tilt="6">
          <div className="glass-spot" />
          <span className="pill-icon"><Film /></span>
          <h3>Record in one click</h3>
          <p>Save your live output with your mic.</p>
          <div className="viz-rec" aria-hidden="true"><span><Circle size={9} fill="currentColor" /> REC</span>{Array.from({ length: 22 }, (_, i) => <i key={i} style={{ animationDelay: `${(i % 7) * 0.11}s` }} />)}</div>
        </article>
        <article className="glass bento-e" data-tilt="6">
          <div className="glass-spot" />
          <span className="pill-icon"><ShieldCheck /></span>
          <h3>Honest by design</h3>
          <p>An “AI video” label is on by default — burned into your output and recordings.</p>
          <span className="viz-label"><i /> AI video</span>
        </article>
        <article className="glass bento-f" data-tilt="6">
          <div className="glass-spot" />
          <span className="pill-icon"><PictureInPicture2 /></span>
          <h3>Bring it anywhere</h3>
          <p>Pop out the output window and share it into Zoom, Meet, Teams or OBS.</p>
          <div className="viz-apps" aria-hidden="true">{['Zoom', 'Google Meet', 'Teams', 'OBS', 'TikTok Live', 'YouTube'].map(a => <span key={a}>{a}</span>)}</div>
        </article>
      </div>
    </section>
  );
}

function Numbers() {
  const { config } = useApp();
  const perCredit = config ? `₦${(config.pricePerCreditKobo / 100).toLocaleString('en-NG')}` : '₦55';
  const items = [[perCredit, 'per credit, no subscription'], ['1 sec', 'billing, rounded at the end'], ['0', 'installs — runs in your browser'], ['3', 'steps from portrait to call']];
  return (
    <section className="shell numbers" data-reveal-group>
      {items.map(([n, l]) => <div key={l}><strong>{n}</strong><span>{l}</span></div>)}
    </section>
  );
}

export function DownloadCard() {
  const { config, user } = useApp();
  const winUrl = config?.links?.windowsApp;
  return (
    <section className="shell section" id="download" aria-labelledby="download-title">
      <div className="glass download-card" data-reveal data-tilt="2">
        <div className="glass-spot" />
        <div className="download-main">
          <div className="download-id">
            <LogoMark className="app-icon" />
            <div>
              <p className="kicker">Live video for your calls</p>
              <h2 id="download-title">{winUrl ? 'FaceHub for Windows' : 'Bring it to any call'}</h2>
              <p>{winUrl ? 'Built-in virtual camera. Same account and video credits.' : 'Pop out your live output and share it into calls and streams.'}</p>
            </div>
          </div>
          <div className="download-action">
            {winUrl
              ? <a className="btn btn-glow" href={winUrl}><Download /> Download for Windows</a>
              : <Link className="btn btn-glow" to={user ? '/studio' : '/register'}><Globe /> Use in your browser</Link>}
            <span>{winUrl ? 'Windows x64 · Windows 11 recommended' : 'Chrome or Edge recommended · Windows, Mac, Linux'}</span>
          </div>
        </div>
        <details className="details">
          <summary>Camera requirements <ChevronRight /></summary>
          <div>
            <p><strong>Free preview, paid live output.</strong> Your camera preview is private and never broadcast. Live AI output starts only when you press Go live, and that is when credits are used.</p>
            <p><strong>Using it in a call?</strong> Open the pop-out output window and share it in your calling app, or capture it with OBS and start OBS Virtual Camera. Keep the studio tab open while you’re live.</p>
            <p>Requires a webcam, a modern browser (Chrome, Edge or Safari 17+) and a stable internet connection. Use portraits you have permission to use and let others know your video is AI-transformed.</p>
          </div>
        </details>
      </div>
    </section>
  );
}

// ───────────────────────── CTA with shader gradient ─────────────────────────
function Cta() {
  const { user } = useApp();
  const canvasRef = useRef(null);
  useEffect(() => {
    let scene, disposed = false;
    import('../three/scenes.js').then(({ GradientScene, webglAvailable }) => {
      if (disposed || !webglAvailable()) return;
      try { scene = new GradientScene(canvasRef.current, { intensity: 1.25 }); } catch { /* CSS fallback stays */ }
    });
    return () => { disposed = true; scene?.dispose(); };
  }, []);
  return (
    <section className="shell section">
      <div className="cta" data-reveal>
        <div className="cta-canvas" ref={canvasRef} aria-hidden="true" />
        <div className="cta-inner">
          <p className="kicker">Your next character is waiting</p>
          <Split lines={['Show up', { text: 'differently.', className: 'grad' }]} />
          <Link to={user ? '/studio' : '/register'} className="btn btn-light btn-lg">{user ? 'Open the studio' : 'Create your free account'} <ArrowRight /></Link>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  useDocumentTitle('');
  const ref = useRef(null);
  useMotion(ref);
  return (
    <div ref={ref} className="home">
      <Hero />
      <Marquee />
      <Experience />
      <Bento />
      <Numbers />
      <DownloadCard />
      <Cta />
    </div>
  );
}
