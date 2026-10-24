import React, { useEffect, useState } from 'react';
import { ArrowRight, Check, ChevronDown, Download, Monitor, PictureInPicture2, ShieldCheck, Sparkles, UserRound, Video } from 'lucide-react';
import { Link, clock, useApp, useDocumentTitle } from '../lib/core.jsx';
import { LogoMark } from '../components/Layout.jsx';

const CHARACTERS = [
  { name: 'Amara', src: '/characters/amara.webp' },
  { name: 'Kofi', src: '/characters/kofi.webp' },
  { name: 'Nova', src: '/characters/nova.webp' },
];

/** Before/after window. Plays your own demo video when DEMO_VIDEO_URL is set; otherwise a labelled illustration. */
export function DemoFrame() {
  const { config } = useApp();
  const video = config?.links?.demoVideo;
  const short = config?.brand?.name?.split(' ').slice(-1)[0] || 'FaceHub';
  const [active, setActive] = useState(0);
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    if (video || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const t = setInterval(() => setActive(a => (a + 1) % CHARACTERS.length), 3800);
    const c = setInterval(() => setSecs(s => (s + 1) % 60), 1000);
    return () => { clearInterval(t); clearInterval(c); };
  }, [video]);

  return (
    <figure className="demo-window" id="live-demo">
      <div className="demo-bar">
        <span className="dots"><i /><i /><i /></span>
        <span>{short} / Live transformation</span>
        <span className="mono">{video ? '' : clock(secs)}</span>
      </div>
      {video ? (
        <div className="demo-video">
          <video src={video} controls playsInline preload="metadata" poster="/demo/performer.webp" />
        </div>
      ) : (
        <div className="demo-split" role="img" aria-label="Illustration: a person on camera on the left, the same performance as an AI character on the right">
          <div className="demo-half you">
            <img src="/demo/performer.webp" alt="" />
            <span className="demo-tag">You</span>
          </div>
          <div className="demo-half ai">
            {CHARACTERS.map((c, i) => <img key={c.src} src={c.src} alt="" className={i === active ? 'on' : ''} />)}
            <span className="demo-scan" key={active} />
            <span className="demo-brand"><LogoMark className="demo-brand-mark" /> {short}</span>
            <span className="demo-tag right"><span className="live-dot" /> AI video · {CHARACTERS[active].name}</span>
          </div>
        </div>
      )}
      <figcaption className="demo-caption">
        <span><Sparkles /> Your expressions lead. The character follows.</span>
        <span>{video ? 'Example output. Results vary.' : 'Illustration. Results vary.'}</span>
      </figcaption>
    </figure>
  );
}

export function DownloadCard() {
  const { config, user } = useApp();
  const winUrl = config?.links?.windowsApp;
  const short = config?.brand?.name?.split(' ').slice(-1)[0] || 'FaceHub';
  return (
    <section className="dl-card" id="download" aria-labelledby="download-title">
      <div className="dl-main">
        <div className="dl-id">
          <span className="dl-icon"><LogoMark className="dl-mark" /></span>
          <div>
            <p className="kicker">Live video for your calls</p>
            <h2 id="download-title">{winUrl ? `${short} for Windows` : `${short} in your browser`}</h2>
            <p>{winUrl ? 'Built-in virtual camera. Same account and video credits.' : 'Nothing to install. Same account and video credits everywhere.'}</p>
          </div>
        </div>
        <div className="dl-action">
          {winUrl
            ? <a className="btn btn-primary" href={winUrl}><Download /> Download for Windows</a>
            : <Link className="btn btn-primary" to={user ? '/studio' : '/register'}>{user ? 'Open the studio' : 'Start in your browser'} <ArrowRight /></Link>}
          <span>{winUrl ? 'Windows x64 · Windows 11 recommended' : 'Chrome or Edge recommended · Windows, Mac, Linux'}</span>
        </div>
      </div>
      <div className="dl-row">
        <p><strong>Using it in Zoom, Meet or Teams?</strong> Pop out the live output window and share it in your call, or capture it in OBS as a virtual camera. Keep the studio open while you’re live.</p>
        <span><Monitor size={16} /> {winUrl ? 'Mac coming soon' : 'Desktop app coming soon'}</span>
      </div>
      <details className="dl-details">
        <summary>Camera requirements <ChevronDown /></summary>
        <div>
          <p><strong>Free preview, paid live output.</strong> Your camera preview is private and never broadcast. Live AI output starts only when you press Go live, and that is when credits are used.</p>
          <p>You need a webcam, a modern browser (Chrome, Edge or Safari 17+) and a stable internet connection (10 Mbps upload recommended). The AI runs on our GPU servers, so you don’t need a powerful computer.</p>
        </div>
      </details>
    </section>
  );
}

export default function Home() {
  useDocumentTitle('');
  const { user, config } = useApp();
  const winUrl = config?.links?.windowsApp;
  const start = user ? '/studio' : '/register';
  return (
    <div className="shell home">
      <section className="hero2" aria-labelledby="hero-title">
        <div>
          <p className="release"><span className="dot" /> Browser studio + motion controls <b>NEW</b></p>
          <h1 id="hero-title">A new face.<br /><span>Same you.</span></h1>
        </div>
        <div className="hero2-side">
          <p className="hero2-lede">Your expressions. Your movement. A whole new character—for comedy, creative livestreams and calls where everyone knows it’s AI.</p>
          <div className="hero2-actions">
            {winUrl ? (
              <>
                <a href={winUrl} className="btn btn-primary"><Download /> Download for Windows</a>
                <Link to={start} className="link-arrow">Use in your browser <ArrowRight /></Link>
              </>
            ) : (
              <>
                <Link to={start} className="btn btn-primary">{user ? 'Open your studio' : 'Start in your browser'} <ArrowRight /></Link>
                <Link to="/pricing" className="link-arrow">See pricing <ArrowRight /></Link>
              </>
            )}
          </div>
          <p className="hero2-facts">
            <span><Check /> {winUrl ? 'No OBS needed' : 'No install'}</span>
            <span><Check /> Free camera preview</span>
            <span><Check /> Pay in naira</span>
          </p>
        </div>
      </section>

      <DemoFrame />

      <div className="proof">
        <strong>One portrait. Endless possibilities.</strong>
        <span>Real-time AI<i />{winUrl ? 'Built-in virtual camera' : 'Pop-out output window'}<i />Pay in naira</span>
      </div>

      <DownloadCard />

      <section className="steps-section" id="how-it-works" aria-labelledby="steps-title">
        <div className="steps-head">
          <div>
            <p className="kicker">From portrait to video call</p>
            <h2 id="steps-title">Less setup.<br /><span>More you.</span></h2>
          </div>
          <p>Three steps in the {winUrl ? 'Windows app' : 'browser studio'}.<br />{winUrl ? 'No OBS. No screen cropping.' : 'No installs. No screen cropping.'}</p>
        </div>
        <ol className="steps-row">
          <li>
            <div className="step-top"><span>01</span><UserRound /></div>
            <h3>Pick your character.</h3>
            <p>Try a sample or upload a portrait you have permission to use.</p>
            <div className="mini-portraits" aria-hidden="true">
              {CHARACTERS.map(c => <img key={c.src} src={c.src} alt="" loading="lazy" />)}
              <span>Your look.<br />Your choice.</span>
            </div>
          </li>
          <li>
            <div className="step-top"><span>02</span><Video /></div>
            <h3>Preview. Then go live.</h3>
            <p>Check your camera and framing for free. Start live generation when you’re ready.</p>
            <div className="step-foot"><span className="dot" /> Preview first. No credits used.</div>
          </li>
          <li>
            <div className="step-top"><span>03</span><Check /></div>
            <h3>Bring it to your call.</h3>
            <p>{winUrl ? 'Select the virtual camera in your calling app’s camera settings. Keep the studio open.' : 'Pop out the live output and share it in your calling or streaming app. Keep the studio open.'}</p>
            <div className="step-foot"><PictureInPicture2 /> {winUrl ? 'Built-in virtual camera' : 'One-click output window'}</div>
          </li>
        </ol>
        <p className="safety-note">
          <ShieldCheck />
          <span><strong>Made for creativity. Not deception.</strong> Create characters for skits, livestreams and consensual pranks. Disclose AI use and follow each platform’s rules. Scams, identity theft, deceptive impersonation and using the studio to pass identity checks are prohibited. <Link to="/safety">Safety rules &amp; report abuse</Link></span>
        </p>
      </section>

      <section className="cta-row" aria-labelledby="cta-title">
        <div>
          <p className="kicker">Your next character is waiting</p>
          <h2 id="cta-title">Show up differently.</h2>
        </div>
        {winUrl
          ? <a href={winUrl} className="btn btn-primary btn-lg">Get the Windows app <ArrowRight /></a>
          : <Link to={start} className="btn btn-primary btn-lg">{user ? 'Open the studio' : 'Get started free'} <ArrowRight /></Link>}
      </section>
    </div>
  );
}
