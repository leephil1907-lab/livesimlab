import React, { useEffect, useState } from 'react';
import { ArrowRight, Check, Eye, EyeOff, Wallet } from 'lucide-react';
import { Link, api, credits as fmtCredits, naira, useApp, useDocumentTitle, useRouter } from '../lib/core.jsx';
import { Brand } from '../components/Layout.jsx';

function AuthShell({ children }) {
  return (
    <div className="auth-page">
      <aside className="auth-side">
        <div className="auth-side-art" aria-hidden="true">
          {['amara', 'kofi', 'nova'].map(n => <div key={n} style={{ backgroundImage: `url(/characters/${n}.webp)` }} />)}
        </div>
        <Brand dark />
        <blockquote>A new face.<br /><span>Same you.</span></blockquote>
        <ul>
          <li><Check /> Free camera preview — no card needed</li>
          <li><Check /> Live AI characters in your browser</li>
          <li><Check /> Pay in naira, only for what you use</li>
        </ul>
      </aside>
      <main className="auth-main" id="main-content">
        <div className="auth-box">
          <Brand />
          {children}
        </div>
      </main>
    </div>
  );
}

function PasswordInput({ value, onChange, autoComplete, id }) {
  const [show, setShow] = useState(false);
  return (
    <div className="pw-wrap">
      <input id={id} className="input" type={show ? 'text' : 'password'} value={value} onChange={onChange} autoComplete={autoComplete} required minLength={autoComplete === 'new-password' ? 8 : undefined} />
      <button type="button" className="pw-toggle" onClick={() => setShow(s => !s)} aria-label={show ? 'Hide password' : 'Show password'}>{show ? <EyeOff /> : <Eye />}</button>
    </div>
  );
}

/** Where to go after sign-in: pending purchase → billing, ?next= → there, else studio. */
function nextPath(query) {
  if (query.get('package')) return `/billing?package=${encodeURIComponent(query.get('package'))}`;
  if (query.get('credits')) return `/billing?credits=${encodeURIComponent(query.get('credits'))}`;
  const next = query.get('next');
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/studio';
}

function SelectedPlan() {
  const { query } = useRouter();
  const { config } = useApp();
  const pkg = config?.packages.find(p => p.id === query.get('package'));
  const custom = Number(query.get('credits'));
  if (!pkg && !custom) return null;
  return (
    <div className="selected-plan">
      <Wallet />
      {pkg ? <span><b>{pkg.name}</b> · {fmtCredits(pkg.credits)} credits · {naira(pkg.priceKobo)} — checkout after sign-up</span>
        : <span><b>{fmtCredits(custom)} credits</b> — checkout after sign-up</span>}
    </div>
  );
}

export function Login() {
  useDocumentTitle('Sign in');
  const { setUser, user, config } = useApp();
  const { query, navigate, search } = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (user) navigate(nextPath(query), { replace: true }); }, [user]); // eslint-disable-line
  const submit = async e => {
    e.preventDefault(); setBusy(true); setError('');
    try { const { user } = await api('/auth/login', { method: 'POST', body: form }); setUser(user); }
    catch (err) { setError(err.message); setBusy(false); }
  };
  const support = config?.links?.whatsapp ? `https://wa.me/${config.links.whatsapp}` : config?.links?.email ? `mailto:${config.links.email}` : null;
  return (
    <AuthShell>
      <h1>Welcome back.</h1>
      <p>Sign in to your studio.</p>
      <SelectedPlan />
      <form className="auth-form" onSubmit={submit}>
        {error && <div className="form-error" role="alert">{error}</div>}
        <label className="field"><span>Email</span><input className="input" type="email" autoComplete="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label>
        <label className="field"><span>Password</span><PasswordInput autoComplete="current-password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></label>
        <button className="btn btn-primary btn-lg btn-block" disabled={busy}>{busy ? <span className="spinner" /> : <>Sign in <ArrowRight /></>}</button>
      </form>
      <p className="auth-alt">New here? <Link to={`/register${search}`}>Create an account</Link></p>
      {support && <p className="auth-alt" style={{ marginTop: 8 }}>Forgot your password? <Link to={support}>Contact support</Link></p>}
    </AuthShell>
  );
}

export function Register() {
  useDocumentTitle('Create your account');
  const { setUser, user } = useApp();
  const { query, navigate, search } = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '', acceptTerms: false });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (user) navigate(nextPath(query), { replace: true }); }, [user]); // eslint-disable-line
  const submit = async e => {
    e.preventDefault(); setBusy(true); setError('');
    try { const { user } = await api('/auth/register', { method: 'POST', body: form }); setUser(user); }
    catch (err) { setError(err.message); setBusy(false); }
  };
  return (
    <AuthShell>
      <h1>Create your studio.</h1>
      <p>Free camera preview. No card needed.</p>
      <SelectedPlan />
      <form className="auth-form" onSubmit={submit}>
        {error && <div className="form-error" role="alert">{error}</div>}
        <label className="field"><span>Your name</span><input className="input" autoComplete="name" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
        <label className="field"><span>Email</span><input className="input" type="email" autoComplete="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label>
        <label className="field"><span>Password</span><PasswordInput autoComplete="new-password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /><small>At least 8 characters.</small></label>
        <label className="check">
          <input type="checkbox" checked={form.acceptTerms} onChange={e => setForm({ ...form, acceptTerms: e.target.checked })} required />
          <span>I’m 18+ and agree to the <Link to="/terms">terms</Link> and <Link to="/acceptable-use">acceptable use policy</Link>. I’ll only use portraits I have permission to use.</span>
        </label>
        <button className="btn btn-primary btn-lg btn-block" disabled={busy}>{busy ? <span className="spinner" /> : <>Create account <ArrowRight /></>}</button>
      </form>
      <p className="auth-alt">Already have an account? <Link to={`/login${search}`}>Sign in</Link></p>
    </AuthShell>
  );
}
