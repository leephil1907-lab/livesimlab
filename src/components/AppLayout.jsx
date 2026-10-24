import React, { useEffect, useRef, useState } from 'react';
import { Coins, CreditCard, ImagePlus, LayoutDashboard, LogOut, ScanFace, Settings, Shield, Upload, UserRound } from 'lucide-react';
import { Link, api, credits as fmtCredits, useApp, useRouter, useToast } from '../lib/core.jsx';
import { Brand } from './Layout.jsx';

export function AppLayout({ children }) {
  const { user, logout } = useApp();
  const { path, navigate } = useRouter();
  useEffect(() => {
    document.documentElement.style.background = '#141517';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#141517');
    return () => {
      document.documentElement.style.background = '';
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#f5f5f2');
    };
  }, []);
  const links = [
    ['/studio', 'Studio', ScanFace],
    ['/characters', 'Characters', UserRound],
    ['/billing', 'Credits', CreditCard],
    ['/account', 'Account', Settings],
    ...(user?.isAdmin ? [['/admin', 'Admin', Shield]] : []),
  ];
  const isActive = to => path === to || path.startsWith(to + '/');
  const signOut = async () => { await logout(); navigate('/'); };
  return (
    <div className="app-theme">
      <div className="app-shell">
        <aside className="app-side" aria-label="Studio navigation">
          <Brand to="/" dark />
          {links.map(([to, label, Icon]) => (
            <Link key={to} to={to} className={`side-link${isActive(to) ? ' active' : ''}`}><Icon /> {label}</Link>
          ))}
          <div className="side-foot">
            <div className="balance-card">
              <span>Studio credits</span>
              <strong className="tabular">{fmtCredits(user?.credits || 0)} <small>credits</small></strong>
              <Link to="/billing" className="btn btn-primary btn-sm btn-block"><Coins size={15} /> Buy credits</Link>
            </div>
            <div className="user-chip">
              <span className="avatar">{(user?.name || '?').slice(0, 1).toUpperCase()}</span>
              <div><b>{user?.name}</b><small>{user?.email}</small></div>
              <button onClick={signOut} aria-label="Sign out" title="Sign out"><LogOut size={17} /></button>
            </div>
          </div>
        </aside>
        <div>
          <div className="app-mobile-bar">
            <Brand to="/" dark />
            <Link to="/billing" className="credits-pill"><Coins /> {fmtCredits(user?.credits || 0)}</Link>
          </div>
          <main className="app-main" id="main-content">{children}</main>
        </div>
      </div>
      <nav className="app-tabs" aria-label="Studio navigation">
        {links.map(([to, label, Icon]) => <Link key={to} to={to} className={isActive(to) ? 'active' : ''}><Icon /> {label}</Link>)}
      </nav>
    </div>
  );
}

export function Modal({ title, children, onClose, actions, description }) {
  const ref = useRef(null);
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    ref.current?.querySelector('input, button')?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-back" onMouseDown={e => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
        {children}
        {actions && <div className="modal-actions">{actions}</div>}
      </div>
    </div>
  );
}

export function Switch({ checked, onChange, label }) {
  return (
    <span className="switch">
      <input type="checkbox" role="switch" checked={checked} onChange={e => onChange(e.target.checked)} aria-label={label} />
      <i />
    </span>
  );
}

/** Resize to max 1024px and re-encode as JPEG so uploads are small and EXIF is stripped. */
async function prepareImage(file) {
  if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) throw new Error('Please choose a JPG, PNG or WebP image.');
  if (file.size > 15 * 1024 * 1024) throw new Error('That image is too large. Please use one under 15 MB.');
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1024 / Math.max(bitmap.width, bitmap.height));
  if (Math.min(bitmap.width, bitmap.height) < 160) throw new Error('That image is too small. Use a portrait at least 256 px wide.');
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  return canvas.toDataURL('image/jpeg', 0.9);
}

export function UploadCharacterModal({ onClose, onCreated }) {
  const toast = useToast();
  const [image, setImage] = useState(null);
  const [name, setName] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);
  const pick = async file => {
    if (!file) return;
    setError('');
    try {
      setImage(await prepareImage(file));
      if (!name) setName(file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').slice(0, 40));
    } catch (err) { setError(err.message); }
  };
  const save = async () => {
    setBusy(true); setError('');
    try {
      const { character } = await api('/characters', { method: 'POST', body: { name, image, consent } });
      toast('Character added.', 'success');
      onCreated?.(character);
      onClose();
    } catch (err) { setError(err.message); setBusy(false); }
  };
  return (
    <Modal
      title="Add a character"
      description="Use a sharp, front-facing portrait with even lighting and one face in frame."
      onClose={onClose}
      actions={<>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={!image || !consent || busy} onClick={save}>{busy ? <span className="spinner" /> : 'Save character'}</button>
      </>}
    >
      <div className="modal-body">
        {error && <div className="form-error" role="alert">{error}</div>}
        {image ? (
          <div className="upload-preview">
            <img src={image} alt="Selected portrait preview" />
            <div style={{ display: 'grid', gap: 8 }}>
              <button className="btn btn-light btn-sm" onClick={() => inputRef.current?.click()}><Upload size={15} /> Choose another</button>
            </div>
          </div>
        ) : (
          <label
            className={`upload-drop${drag ? ' drag' : ''}`}
            onDragOver={e => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={e => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files?.[0]); }}
          >
            <ImagePlus />
            <b style={{ color: 'var(--ink)' }}>Drop a portrait or click to browse</b>
            <small>JPG, PNG or WebP</small>
            <input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={e => pick(e.target.files?.[0])} />
          </label>
        )}
        <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={e => pick(e.target.files?.[0])} />
        <label className="field"><span>Character name</span><input className="input" value={name} maxLength={40} onChange={e => setName(e.target.value)} placeholder="e.g. Stage persona" /></label>
        <label className="check">
          <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />
          <span>This is me, a character I own, or someone who has given me permission to use their likeness. I won’t use it to impersonate or deceive anyone.</span>
        </label>
      </div>
    </Modal>
  );
}
