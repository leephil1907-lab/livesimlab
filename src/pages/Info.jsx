import React from 'react';
import { ArrowRight, Download as DownloadIcon, Globe, Monitor } from 'lucide-react';
import { Link, useApp, useDocumentTitle } from '../lib/core.jsx';
import { Faq } from './Pricing.jsx';

export function Download() {
  useDocumentTitle('Download');
  const { config, user } = useApp();
  const win = config?.links?.windowsApp;
  return (
    <>
      <section className="page-hero shell">
        <p className="kicker">Your studio. Your choice.</p>
        <h1>Your look. <span>Anywhere.</span></h1>
        <p>Use the browser studio on any computer, or the Windows app when it’s available. One account, one wallet.</p>
      </section>
      <div className="shell">
        <div className="app-cards">
          <article className="card app-card dark">
            <span className="pill"><Globe size={15} /> Browser studio</span>
            <h2>Works right now</h2>
            <p>Preview your camera, pick a character and go live from Chrome, Edge or Safari. Record your output or pop it out for calls.</p>
            <Link to={user ? '/studio' : '/register'} className="btn btn-light">{user ? 'Open studio' : 'Start in your browser'} <ArrowRight /></Link>
            <small>Windows · Mac · Linux · No install</small>
            <div className="note">
              <strong style={{ color: '#f5f5f2' }}>Using it in Zoom, Meet or Teams</strong>
              <ol className="obs-steps">
                <li>Go live in the studio, then click <b>Pop out output</b>.</li>
                <li>Share that window in your call, or add it to OBS as a <b>Window Capture</b>.</li>
                <li>In OBS, click <b>Start Virtual Camera</b> and choose “OBS Virtual Camera” in your calling app.</li>
              </ol>
            </div>
          </article>
          <article className="card app-card">
            <span className="pill"><Monitor size={15} /> Windows app</span>
            <h2>{win ? 'Built-in virtual camera' : 'Coming soon'}</h2>
            <p>{win ? 'Bring your character straight into video calls. No OBS needed. Uses your same credits.' : 'A native app with a built-in virtual camera is on the way. Until then, the browser studio does everything you need.'}</p>
            {win
              ? <a href={win} className="btn btn-primary"><DownloadIcon /> Download for Windows</a>
              : <button className="btn btn-light" disabled>Not available yet</button>}
            <small>Windows x64 · Windows 11 recommended</small>
            <p className="note">Not every calling app accepts virtual cameras. Always let others know your video is AI-transformed.</p>
          </article>
        </div>

        <section className="section faq">
          <div className="faq-intro">
            <p className="kicker">Get started</p>
            <h2>Choose a way in. <span>Make it yours.</span></h2>
          </div>
          <Faq items={[
            ['What does my computer need?', 'A webcam, a modern browser and a stable internet connection (10 Mbps upload or better recommended). AI processing runs on our GPU servers, so you don’t need a powerful graphics card.'],
            ['Can I use it on my phone?', 'The studio works best on a laptop or desktop. Mobile browsers can preview, but live output for calls needs a computer.'],
            ['Why is my output window black in OBS?', 'Start live generation first; the output window only shows AI frames while you are live. In OBS, use Window Capture and pick the “Live output” window. On Windows, set the capture method to “Windows 10 (1903 and up)”.'],
            ['Having trouble?', <>We recommend Google Chrome. If you need help, <Link to="/how-it-works#faq">read the guide</Link> or chat with support.</>],
          ]} />
        </section>
      </div>
    </>
  );
}

export function HowItWorks() {
  useDocumentTitle('How live AI video works');
  return (
    <>
      <section className="page-hero shell">
        <p className="kicker">Guide</p>
        <h1>How live AI video <span>works.</span></h1>
        <p>From one portrait to a live character that follows your expressions — in a few minutes.</p>
      </section>
      <article className="prose shell">
        <h2>1. Create your account</h2>
        <p>Sign up with your email. Your camera preview is free forever, so you can set up lighting and framing before you buy anything.</p>
        <h2>2. Choose a character</h2>
        <p>Pick a sample character or upload your own portrait. For best results, use a sharp, front-facing photo with even lighting, one face in frame and nothing covering the eyes or mouth.</p>
        <div className="callout"><strong>Permission matters.</strong> Only upload portraits of yourself, of people who have given you permission, or of characters you have the rights to. Never use the studio to impersonate a real person or to deceive anyone.</div>
        <h2>3. Preview for free</h2>
        <p>Open the studio and allow camera access. Face the camera, keep your face well lit from the front, and leave a little space above your head. None of this uses credits.</p>
        <h2>4. Go live</h2>
        <p>Choose a model, set a credit limit and press <b>Go live</b>. Your camera frames are streamed securely to our GPU engine, transformed in real time and sent back to the studio.</p>
        <ul>
          <li><b>Signature</b> — highest fidelity, 1 credit per second.</li>
          <li><b>Nova</b> — faster and lighter, 0.5 credits per second.</li>
        </ul>
        <p>You can switch character mid-take. Press <b>Stop</b> whenever you like: usage is rounded up to a whole credit and the rest of your reservation returns to your wallet.</p>
        <h2>5. Record or bring it to a call</h2>
        <p>Press <b>Record</b> to save your live output (with your microphone) as a video file. To use it in a call, click <b>Pop out output</b> and share that window, or capture it in OBS and start OBS Virtual Camera.</p>
        <h2 id="faq">Tips &amp; troubleshooting</h2>
        <h3>The character looks unstable</h3>
        <p>Improve front lighting, move closer to the camera and avoid strong backlight from windows. Keep your head roughly centred.</p>
        <h3>Output is laggy</h3>
        <p>Close other video apps, use a wired connection or stand closer to your router, and try the Nova model.</p>
        <h3>My camera isn’t detected</h3>
        <p>Allow camera access in the browser address bar, close other apps using the camera, and reload the studio.</p>
        <p style={{ marginTop: 40 }}><Link to="/register" className="btn btn-primary">Start your free preview <ArrowRight /></Link></p>
      </article>
    </>
  );
}

function Legal({ title, children }) {
  useDocumentTitle(title);
  return (
    <>
      <section className="page-hero shell"><p className="kicker">Legal</p><h1>{title}</h1></section>
      <article className="prose shell">{children}</article>
    </>
  );
}

export function Terms() {
  const { config } = useApp();
  const name = config?.brand?.name || 'Reachmark FaceHub';
  return (
    <Legal title="Terms of use">
      <p className="updated">Last updated: {new Date().toLocaleDateString('en-NG', { month: 'long', year: 'numeric' })}</p>
      <p>These terms govern your use of {name} (“the service”). By creating an account you agree to them.</p>
      <h2>Your account</h2>
      <p>You must be at least 18 years old. Keep your password safe; you are responsible for activity on your account.</p>
      <h2>Credits and payments</h2>
      <p>Credits are purchased in Nigerian naira through Paystack and are used for live AI generation. Credits do not expire and are non-transferable. Purchases are final except where required by law or where a technical fault on our side prevented the service from working; contact support within 7 days.</p>
      <h2>Acceptable use</h2>
      <p>You must follow our <Link to="/acceptable-use">acceptable use policy</Link>. In particular, you may only use portraits you have the right to use, and you must not use the service to impersonate, defraud, harass or deceive anyone.</p>
      <h2>Your content</h2>
      <p>You keep ownership of the portraits you upload and the recordings you make. You grant us a limited licence to process them solely to provide the service.</p>
      <h2>Termination</h2>
      <p>We may suspend accounts that break these terms. Unused credits on accounts suspended for fraud or abuse are forfeited.</p>
      <h2>Liability</h2>
      <p>The service is provided “as is”. Results vary with lighting, camera and network quality. To the extent permitted by law, our liability is limited to the amount you paid in the previous three months.</p>
    </Legal>
  );
}

export function Privacy() {
  const { config } = useApp();
  const name = config?.brand?.name || 'Reachmark FaceHub';
  return (
    <Legal title="Privacy">
      <p className="updated">Last updated: {new Date().toLocaleDateString('en-NG', { month: 'long', year: 'numeric' })}</p>
      <p>This policy explains what {name} collects and why, in line with the Nigeria Data Protection Act 2023.</p>
      <h2>What we collect</h2>
      <ul>
        <li><b>Account data</b>: your name, email and a securely hashed password.</li>
        <li><b>Portraits you upload</b>: stored privately and only used to render your chosen character.</li>
        <li><b>Payments</b>: handled by Paystack. We store the reference, amount and status, never your card details.</li>
        <li><b>Usage</b>: live session duration and credits used, so we can bill accurately.</li>
      </ul>
      <h2>Camera frames</h2>
      <p>Your free preview stays on your device. During live generation, frames are streamed to our GPU engine, processed in memory and returned to you. We do not store your live video. Recordings are created in your browser and saved to your device.</p>
      <h2 id="tracking-preferences">Cookies</h2>
      <p>Essential cookies keep you signed in and secure. Optional analytics cookies are only used if you accept them. You can change your choice any time from “Cookie preferences” in the footer.</p>
      <h2>Your rights</h2>
      <p>You can access, correct or delete your data, or delete individual portraits from the Characters page. To delete your account, contact support{config?.links?.email ? <> at <a href={`mailto:${config.links.email}`}>{config.links.email}</a></> : ''}.</p>
    </Legal>
  );
}

export function AcceptableUse() {
  return (
    <Legal title="Acceptable use">
      <p>The studio is built for comedy, creative livestreams, content creation and calls where everyone knows it’s AI. To keep it that way:</p>
      <h2>You may</h2>
      <ul>
        <li>Use your own face, sample characters, or portraits you have clear permission or rights to use.</li>
        <li>Perform as a character in content and calls where the audience knows the video is AI-transformed.</li>
      </ul>
      <h2>You must not</h2>
      <ul>
        <li>Impersonate a real person without their consent, or pose as someone else to gain trust, money or information.</li>
        <li>Use the service for fraud, romance or investment scams, extortion, harassment or bypassing identity verification.</li>
        <li>Create sexual content of real people, or any content involving minors.</li>
        <li>Remove or hide AI disclosures in contexts where people would reasonably expect real video.</li>
      </ul>
      <p>We cooperate with law enforcement on reports of misuse and suspend accounts that break these rules.</p>
    </Legal>
  );
}

export function Safety() {
  const { config } = useApp();
  const links = config?.links || {};
  const report = links.email ? `mailto:${links.email}?subject=${encodeURIComponent('Abuse report')}` : links.whatsapp ? `https://wa.me/${links.whatsapp}` : null;
  return (
    <Legal title="Safety rules">
      <p><strong>Made for creativity. Not deception.</strong> Characters are for skits, livestreams, content creation, consensual pranks and calls where people know the video is AI.</p>
      <h2>The rules</h2>
      <ul>
        <li>Use your own face, our sample characters, or portraits you have permission to use.</li>
        <li>Tell people your video is AI-transformed, and follow each platform’s rules on AI content.</li>
        <li>Keep the “AI video” label on wherever viewers could mistake the character for real footage.</li>
        <li>No scams, identity theft, extortion or deceptive impersonation of real people.</li>
        <li>Never use the studio to pass face, ID or liveness verification for a bank, exchange, employer or any other service.</li>
        <li>No sexual content of real people, and nothing involving minors.</li>
      </ul>
      <h2>What we do</h2>
      <p>Live output carries a visible AI label by default. We review reports quickly, suspend accounts that break these rules and cooperate with law enforcement where required. See the full <Link to="/acceptable-use">acceptable use policy</Link>.</p>
      <h2>Report abuse</h2>
      <p>Seen a character used to deceive or impersonate someone? Tell us what happened, where and when, with links or screenshots if you have them.</p>
      {report
        ? <p style={{ marginTop: 18 }}><a className="btn btn-primary" href={report}>Report abuse <ArrowRight /></a></p>
        : <div className="callout">Abuse reports: set <code>SUPPORT_EMAIL</code> or <code>SUPPORT_WHATSAPP</code> in your <code>.env</code> to show a contact here.</div>}
    </Legal>
  );
}

export function NotFound() {
  useDocumentTitle('Page not found');
  return (
    <section className="page-hero shell" style={{ minHeight: '50vh' }}>
      <p className="kicker">404</p>
      <h1>This page <span>took a new face.</span></h1>
      <p>We couldn’t find what you were looking for.</p>
      <p style={{ marginTop: 28 }}><Link to="/" className="btn btn-primary">Back home <ArrowRight /></Link></p>
    </section>
  );
}
