import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/base.css';
import './styles/public.css';
import './styles/home.css';
import './styles/app.css';
import { AppProvider, RouterProvider, ToastProvider, useApp, useRouter } from './lib/core.jsx';
import { PublicLayout } from './components/Layout.jsx';
import { AppLayout } from './components/AppLayout.jsx';
import Home from './pages/Home.jsx';
import Pricing from './pages/Pricing.jsx';
import { AcceptableUse, Download, HowItWorks, NotFound, Privacy, Safety, Terms } from './pages/Info.jsx';
import { Login, Register } from './pages/Auth.jsx';
import Studio from './pages/app/Studio.jsx';
import { Account, Admin, Billing, BillingCallback, Characters } from './pages/app/Pages.jsx';

/** Chromeless window that mirrors the studio's live output — share it in calls or capture it in OBS. */
function OutputWindow() {
  const ref = useRef(null);
  const [active, setActive] = useState(false);
  useEffect(() => {
    document.title = 'Live output';
    document.body.style.background = '#000';
    const onMsg = e => {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === 'idle') return setActive(false);
      if (e.data?.type !== 'frame') return;
      const { bitmap } = e.data;
      const c = ref.current;
      if (c.width !== bitmap.width || c.height !== bitmap.height) { c.width = bitmap.width; c.height = bitmap.height; }
      c.getContext('2d').drawImage(bitmap, 0, 0);
      bitmap.close?.();
      setActive(true);
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);
  return (
    <div className="output-page">
      <canvas ref={ref} width="1280" height="720" />
      {!active && <div className="output-wait"><div>Live output<br /><small>Go live in the studio — your AI video appears here.<br />Share this window in your call, or capture it in OBS.</small></div></div>}
    </div>
  );
}

function RequireAuth({ children }) {
  const { user } = useApp();
  const { navigate, path, search } = useRouter();
  useEffect(() => {
    if (user === null) navigate(`/login?next=${encodeURIComponent(path + search)}`, { replace: true });
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!user) return <div className="app-theme"><div className="page-loading"><span className="spinner" /></div></div>;
  return children;
}

const PUBLIC = { '/': Home, '/pricing': Pricing, '/download': Download, '/how-it-works': HowItWorks, '/terms': Terms, '/privacy': Privacy, '/acceptable-use': AcceptableUse, '/safety': Safety };
const PRIVATE = { '/studio': Studio, '/characters': Characters, '/billing': Billing, '/billing/callback': BillingCallback, '/account': Account, '/admin': Admin };

function Routes() {
  const { path } = useRouter();
  const clean = path.replace(/\/+$/, '') || '/';
  if (clean === '/output') return <OutputWindow />;
  if (clean === '/login') return <Login />;
  if (clean === '/register') return <Register />;
  if (PRIVATE[clean]) {
    const Page = PRIVATE[clean];
    return <RequireAuth><AppLayout><Page /></AppLayout></RequireAuth>;
  }
  const Page = PUBLIC[clean] || NotFound;
  return <PublicLayout><Page /></PublicLayout>;
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider>
      <AppProvider>
        <ToastProvider>
          <Routes />
        </ToastProvider>
      </AppProvider>
    </RouterProvider>
  </React.StrictMode>,
);
