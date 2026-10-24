import React, { useEffect, useState } from 'react';
import { ArrowRight, Menu, MessageCircle, X } from 'lucide-react';
import { Link, useApp, useRouter } from '../lib/core.jsx';

export function LogoMark({ className = 'brand-mark', dark = false }) {
  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="16" fill={dark ? '#f5f5f2' : '#1d1f22'} />
      <path d="M20 44c1.8-7 6.4-11 12-11s10.2 4 12 11" fill="none" stroke={dark ? '#1d1f22' : '#f5f5f2'} strokeWidth="3.6" strokeLinecap="round" />
      <circle cx="32" cy="24" r="8" fill="none" stroke={dark ? '#1d1f22' : '#f5f5f2'} strokeWidth="3.6" />
      <path d="M47 11.5l1.6 4.2 4.2 1.6-4.2 1.6L47 23.1l-1.6-4.2-4.2-1.6 4.2-1.6z" fill="#4c7dff" />
    </svg>
  );
}

export function Brand({ to = '/', dark = false, sub = true }) {
  const { config } = useApp();
  const name = config?.brand?.name || 'Reachmark FaceHub';
  const [first, ...rest] = name.split(' ');
  const hasSub = sub && rest.length > 0;
  return (
    <Link to={to} className="brand" aria-label={`${name} home`}>
      <LogoMark dark={dark} />
      <span className="brand-text">{hasSub ? rest.join(' ') : name}{hasSub && <small>by {first}</small>}</span>
    </Link>
  );
}

const NAV = [
  ['/#live-demo', 'The experience'],
  ['/download', 'Download'],
  ['/how-it-works', 'How it works'],
  ['/pricing', 'Pricing'],
];

function Header() {
  const { user } = useApp();
  const { path } = useRouter();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => setOpen(false), [path]);
  return (
    <header className={`site-header${scrolled ? ' scrolled' : ''}`}>
      <nav className="shell site-nav" aria-label="Main navigation">
        <Brand />
        <div className="desktop-nav">
          {NAV.map(([to, label]) => (
            <Link key={to} to={to} className={`nav-link${path === to ? ' active' : ''}`}>{label}</Link>
          ))}
        </div>
        <div className="header-actions">
          {user ? (
            <Link to="/studio" className="btn btn-primary">Open studio <ArrowRight /></Link>
          ) : (
            <>
              <Link to="/login" className="nav-link">Sign in</Link>
              <Link to="/register" className="btn btn-primary">Get started <ArrowRight /></Link>
            </>
          )}
          <button type="button" className="menu-btn" aria-expanded={open} aria-controls="mobile-menu" aria-label={open ? 'Close navigation' : 'Open navigation'} onClick={() => setOpen(o => !o)}>
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </nav>
      <nav id="mobile-menu" className={`mobile-menu${open ? ' open' : ''}`} aria-label="Mobile navigation">
        {NAV.map(([to, label]) => <Link key={to} to={to}>{label}</Link>)}
        {!user && <Link to="/login">Sign in</Link>}
      </nav>
    </header>
  );
}

function Footer({ onCookies }) {
  const { config } = useApp();
  const name = config?.brand?.name || 'Reachmark FaceHub';
  const links = config?.links || {};
  return (
    <footer className="site-footer">
      <div className="shell">
        <div className="footer-grid">
          <div>
            <Brand />
            <p>Real-time AI character transformation for comedy, creative livestreams and calls where everyone knows it’s AI. Pay in naira.</p>
          </div>
          <div>
            <h4>Product</h4>
            <nav>
              <Link to="/how-it-works">How it works</Link>
              <Link to="/pricing">Pricing</Link>
              <Link to="/download">Download</Link>
              <Link to="/register">Browser studio</Link>
            </nav>
          </div>
          <div>
            <h4>Support</h4>
            <nav>
              {links.whatsapp && <Link to={`https://wa.me/${links.whatsapp}`}>WhatsApp</Link>}
              {links.telegram && <Link to={links.telegram}>Telegram</Link>}
              {links.email && <Link to={`mailto:${links.email}`}>{links.email}</Link>}
              <Link to="/how-it-works#faq">Help &amp; FAQ</Link>
            </nav>
          </div>
          <div>
            <h4>Legal</h4>
            <nav>
              <Link to="/terms">Terms of use</Link>
              <Link to="/privacy">Privacy</Link>
              <Link to="/acceptable-use">Acceptable use</Link>
            </nav>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} {name}. All rights reserved.</span>
          <span>Use portraits you have permission to use. Always disclose AI video. <button type="button" onClick={onCookies}>Cookie preferences</button></span>
        </div>
      </div>
    </footer>
  );
}

export function SupportFab() {
  const { config } = useApp();
  const wa = config?.links?.whatsapp;
  if (!wa) return null;
  return (
    <a className="support-fab" href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" title="Assistance or suggestions on WhatsApp">
      <MessageCircle /> <span>Chat with us</span>
    </a>
  );
}

const CONSENT_KEY = 'fh_cookie_consent';
function CookieBanner({ forceOpen, onClose }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(CONSENT_KEY) || 'null');
      if (!saved || saved.expires < Date.now()) setOpen(true);
    } catch { setOpen(true); }
  }, []);
  useEffect(() => { if (forceOpen) setOpen(true); }, [forceOpen]);
  const choose = choice => {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ choice, expires: Date.now() + 180 * 86400_000 }));
    window.dispatchEvent(new CustomEvent('cookie-consent', { detail: choice }));
    setOpen(false);
    onClose?.();
  };
  if (!open) return null;
  return (
    <div className="cookie" role="dialog" aria-labelledby="cookie-title">
      <span className="kicker">You’re in control</span>
      <h2 id="cookie-title">Cookie preferences</h2>
      <p>We use essential cookies to keep you signed in and secure. Optional analytics cookies help us improve. Your choice lasts up to 180 days. <Link to="/privacy">Learn more</Link></p>
      <div className="cookie-actions">
        <button className="btn btn-light btn-sm" onClick={() => choose('rejected')}>Reject</button>
        <button className="btn btn-primary btn-sm" onClick={() => choose('accepted')}>Accept</button>
      </div>
    </div>
  );
}

export function PublicLayout({ children }) {
  const [cookieOpen, setCookieOpen] = useState(false);
  return (
    <>
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <Header />
      <main id="main-content" tabIndex={-1}>{children}</main>
      <Footer onCookies={() => setCookieOpen(true)} />
      <SupportFab />
      <CookieBanner forceOpen={cookieOpen} onClose={() => setCookieOpen(false)} />
    </>
  );
}
