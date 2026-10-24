// App-wide plumbing: API client, tiny router, auth + config context, toasts.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { metaFor } from '../../server/pageMeta.js';

// ───────── API ─────────
export class ApiError extends Error {
  constructor(status, message, body) { super(message); this.status = status; this.body = body; }
}
export async function api(path, { method = 'GET', body, signal } = {}) {
  const res = await fetch(`/api${path}`, {
    method,
    signal,
    credentials: 'same-origin',
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error || 'Something went wrong. Please try again.', data);
  return data;
}

// ───────── Router ─────────
const RouterCtx = createContext(null);
export function RouterProvider({ children }) {
  const [loc, setLoc] = useState(() => ({ path: window.location.pathname, search: window.location.search, hash: window.location.hash }));
  useEffect(() => {
    const onPop = () => setLoc({ path: window.location.pathname, search: window.location.search, hash: window.location.hash });
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  const navigate = useCallback((to, { replace = false } = {}) => {
    const url = new URL(to, window.location.origin);
    if (url.pathname + url.search + url.hash === window.location.pathname + window.location.search + window.location.hash) return;
    window.history[replace ? 'replaceState' : 'pushState']({}, '', url.pathname + url.search + url.hash);
    setLoc({ path: url.pathname, search: url.search, hash: url.hash });
    if (url.hash) setTimeout(() => document.getElementById(url.hash.slice(1))?.scrollIntoView({ behavior: 'smooth' }), 60);
    else window.scrollTo({ top: 0 });
  }, []);
  const value = useMemo(() => ({ ...loc, query: new URLSearchParams(loc.search), navigate }), [loc, navigate]);
  return <RouterCtx.Provider value={value}>{children}</RouterCtx.Provider>;
}
export const useRouter = () => useContext(RouterCtx);

export function Link({ to, children, onClick, ...rest }) {
  const { navigate } = useRouter();
  const external = /^(https?:|mailto:|tel:)/.test(to);
  return (
    <a
      href={to}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      {...rest}
      onClick={e => {
        onClick?.(e);
        if (external || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        navigate(to);
      }}
    >
      {children}
    </a>
  );
}

// ───────── Session + config ─────────
const AppCtx = createContext(null);
export function AppProvider({ children }) {
  const [config, setConfig] = useState(null);
  const [user, setUser] = useState(undefined); // undefined = loading, null = signed out
  const refreshUser = useCallback(async () => {
    try { const { user } = await api('/auth/me'); setUser(user); return user; } catch { setUser(null); return null; }
  }, []);
  const refreshConfig = useCallback(async () => {
    try { setConfig(await api('/config')); } catch { /* keep previous */ }
  }, []);
  useEffect(() => { refreshConfig(); refreshUser(); }, [refreshConfig, refreshUser]);
  const logout = useCallback(async () => { await api('/auth/logout', { method: 'POST' }).catch(() => {}); setUser(null); }, []);
  const value = useMemo(() => ({ config, user, setUser, refreshUser, refreshConfig, logout }), [config, user, refreshUser, refreshConfig, logout]);
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}
export const useApp = () => useContext(AppCtx);

// ───────── Toasts ─────────
const ToastCtx = createContext(() => {});
export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((message, tone = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setItems(list => [...list, { id, message, tone }]);
    setTimeout(() => setItems(list => list.filter(t => t.id !== id)), 4800);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map(t => <div key={t.id} className={`toast toast-${t.tone}`}>{t.message}</div>)}
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

// ───────── Formatting ─────────
export const naira = kobo => '₦' + (kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
export const nairaExact = kobo => '₦' + (kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const credits = n => (Math.round(n * 100) / 100).toLocaleString('en-NG');
export const clock = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
export const dateTime = iso => {
  const d = new Date(iso.replace(' ', 'T') + (iso.endsWith('Z') ? '' : 'Z'));
  return d.toLocaleString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
};
export function useDocumentTitle(title) {
  const { config } = useApp();
  const brand = config?.brand || {};
  useEffect(() => {
    const name = brand.name || 'Reachmark FaceHub';
    const meta = metaFor(window.location.pathname, brand);
    const full = title ? `${title} · ${name}` : `${name} · ${brand.tagline || 'Real-time AI character studio'}`;
    document.title = full;
    const set = (sel, value) => { const el = document.head.querySelector(sel); if (el && value) el.setAttribute('content', value); };
    set('meta[name="description"]', meta.description);
    set('meta[property="og:title"]', full);
    set('meta[name="twitter:title"]', full);
    set('meta[property="og:description"]', meta.description);
    set('meta[name="twitter:description"]', meta.description);
  }, [title, brand.name, brand.tagline, brand.description]);
}
