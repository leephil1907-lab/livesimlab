import React from 'react';
import { ArrowRight, Check, ChevronRight, Download, Info, Monitor, PictureInPicture2, Sparkles, UserRound, Video, Wallet, Film, ShieldCheck, Zap } from 'lucide-react';
import { Link, useApp, useDocumentTitle } from '../lib/core.jsx';
import { LogoMark } from '../components/Layout.jsx';

const PORTRAITS = ['/characters/amara.webp', '/characters/kofi.webp', '/characters/nova.webp'];

export function DemoFrame() {
  return (
    <figure className="demo-frame" id="live-demo">
      <div className="window-bar">
        <span className="dots"><i /><i /><i /></span>
        <span>Studio / Live transformation</span>
        <span>00:28</span>
      </div>
      <div className="demo-stage" role="img" aria-label="Illustration of a live camera being transformed into different characters">
        {PORTRAITS.map(src => <div key={src} className="portrait" style={{ backgroundImage: `url(${src})` }} />)}
        <div className="scan" />
        <div className="vignette" />
        <span className="demo-badge top-left"><span className="live-dot" /> LIVE · AI video</span>
        <span className="demo-badge top-right">1 credit / sec</span>
        <div className="demo-chips" aria-hidden="true">{PORTRAITS.map(src => <img key={src} src={src} alt="" />)}</div>
        <div className="demo-pip" aria-hidden="true">
          <span>YOU</span>
          <svg viewBox="0 0 100 70" fill="currentColor"><circle cx="50" cy="28" r="15" /><path d="M18 70c3-17 16-27 32-27s29 10 32 27z" /></svg>
        </div>
      </div>
      <figcaption>
        <span><Sparkles /> Your expressions lead. The character follows.</span>
        <span>Illustration. Results vary.</span>
      </figcaption>
    </figure>
  );
}

export function DownloadCard() {
  const { config } = useApp();
  const winUrl = config?.links?.windowsApp;
  return (
    <section className="card download-card" id="download" aria-labelledby="download-title">
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
            ? <a className="btn btn-primary" href={winUrl}><Download /> Download for Windows</a>
            : <Link className="btn btn-primary" to="/register">Use in your browser <ArrowRight /></Link>}
          <span>{winUrl ? 'Windows x64 · Windows 11 recommended' : 'Chrome or Edge recommended · Windows, Mac, Linux'}</span>
        </div>
      </div>
      <div className="download-bottom">
        <p><strong>Same login everywhere.</strong> Your credits and characters follow your account between the browser studio{winUrl ? ' and the Windows app' : ''}. <Link to="/download">See all options</Link>.</p>
        <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}><Monitor size={18} /> {winUrl ? 'Mac coming soon' : 'Desktop app coming soon'}</span>
      </div>
      <details className="details">
        <summary>Camera requirements <ChevronRight /></summary>
        <div>
          <p><strong>Free preview, paid live output.</strong> Your camera preview is private and never broadcast. Live AI output starts only when you press Go live, and that is when credits are used.</p>
          <p><strong>Using it in a call?</strong> Open the pop-out output window and share it in your calling app, or capture it with OBS and start OBS Virtual Camera. Keep the studio tab open while you’re live.</p>
          <p>Requires a webcam, a modern browser (Chrome, Edge or Safari 17+) and a stable internet connection. Use portraits you have permission to use and let others know your video is AI-transformed.</p>
        </div>
      </details>
    </section>
  );
}

export default function Home() {
  useDocumentTitle('');
  const { user, config } = useApp();
  const winUrl = config?.links?.windowsApp;
  return (
    <>
      <section className="hero shell" aria-labelledby="hero-title">
        <div>
          <p className="release"><span className="live-dot" /> Live AI character studio <b>NEW</b></p>
          <h1 id="hero-title">A new face.<br /><span>Same you.</span></h1>
          <p className="hero-lede">Your expressions. Your movement. A whole new character — for comedy, creative livestreams and calls where everyone knows it’s AI.</p>
          <div className="hero-actions">
            <Link to={user ? '/studio' : '/register'} className="btn btn-primary btn-lg">{user ? 'Open your studio' : 'Start free preview'} <ArrowRight /></Link>
            {winUrl
              ? <a href={winUrl} className="text-link"><Download /> Download for Windows</a>
              : <Link to="/pricing" className="text-link">See pricing <ArrowRight /></Link>}
          </div>
          <div className="hero-facts">
            <span><Check /> Free camera preview</span>
            <span><Check /> Runs in your browser</span>
            <span><Check /> Pay in naira</span>
          </div>
        </div>
        <DemoFrame />
      </section>

      <div className="shell">
        <div className="proof-strip">
          <span>One portrait. Endless possibilities.</span>
          <span>Real-time AI<i className="sep" />Built-in recording<i className="sep" />Pay in naira with Paystack</span>
        </div>

        <DownloadCard />

        <section className="section" id="how-it-works" aria-labelledby="steps-title">
          <div className="section-heading">
            <div>
              <p className="kicker">From portrait to video call</p>
              <h2 id="steps-title">Less setup.<br /><span>More you.</span></h2>
            </div>
            <p>Three steps in the studio.<br />No installs. No screen cropping.</p>
          </div>
          <ol className="steps">
            <li className="card">
              <div className="step-top"><span>01</span><UserRound /></div>
              <h3>Pick your character.</h3>
              <p>Try a sample or upload a portrait you have permission to use.</p>
              <div className="mini-portraits" aria-hidden="true">
                {PORTRAITS.map(src => <img key={src} src={src} alt="" loading="lazy" />)}
                <span>Your look.<br />Your choice.</span>
              </div>
            </li>
            <li className="card">
              <div className="step-top"><span>02</span><Video /></div>
              <h3>Preview. Then go live.</h3>
              <p>Check your camera and framing for free. Start live generation when you’re ready.</p>
              <div className="step-foot"><span className="live-dot" /> Preview first. No credits used.</div>
            </li>
            <li className="card">
              <div className="step-top"><span>03</span><Check /></div>
              <h3>Bring it to your call.</h3>
              <p>Pop out the live output, then share or capture it in your calling or streaming app.</p>
              <div className="step-foot"><PictureInPicture2 /> One-click output window</div>
            </li>
          </ol>
          <aside className="quiet-note"><Info /> <span>Stop any time. Usage is counted per second and unused reserved credits go straight back to your wallet.</span></aside>
        </section>

        <section className="section" aria-labelledby="studio-title">
          <div className="section-heading">
            <div>
              <p className="kicker">The full studio</p>
              <h2 id="studio-title">All the tools.<br /><span>Every pack.</span></h2>
            </div>
            <p>Everything you need to rehearse, perform and record — with a clear meter so you always know where your credits go.</p>
          </div>
          <div className="feature-grid">
            <article className="card feature"><Zap /><h3>Real-time transformation</h3><p>Your expressions drive the character frame by frame, with low-latency streaming.</p></article>
            <article className="card feature"><Film /><h3>Browser recording</h3><p>Record the generated output with your microphone and download it instantly.</p></article>
            <article className="card feature"><Wallet /><h3>Clear credit meter</h3><p>Set a credit limit per take. Live usage is shown second by second.</p></article>
            <article className="card feature"><ShieldCheck /><h3>Built-in disclosure</h3><p>An optional “AI video” label keeps your audience in the loop.</p></article>
          </div>
        </section>

        <section className="cta" aria-labelledby="cta-title">
          <p className="kicker">Your next character is waiting</p>
          <h2 id="cta-title">Show up differently.</h2>
          <Link to={user ? '/studio' : '/register'} className="btn btn-light btn-lg">{user ? 'Open the studio' : 'Create your free account'} <ArrowRight /></Link>
        </section>
      </div>
    </>
  );
}
