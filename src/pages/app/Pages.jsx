import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, CircleAlert, Clock, Coins, Plus, Search, Trash2, Wallet } from 'lucide-react';
import { Link, api, clock, credits as fmtCredits, dateTime, naira, useApp, useDocumentTitle, useRouter, useToast } from '../../lib/core.jsx';
import { Modal, UploadCharacterModal } from '../../components/AppLayout.jsx';
import { CustomAmount, PlanGrid, useCheckout } from '../Pricing.jsx';

// ───────────────────────── Characters ─────────────────────────
export function Characters() {
  useDocumentTitle('Characters');
  const toast = useToast();
  const [list, setList] = useState(null);
  const [upload, setUpload] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const load = useCallback(() => api('/characters').then(r => setList(r.characters)).catch(e => toast(e.message, 'error')), [toast]);
  useEffect(() => { load(); }, [load]);
  const remove = async c => {
    try { await api(`/characters/${c.id}`, { method: 'DELETE' }); setList(l => l.filter(x => x.id !== c.id)); toast('Character deleted.', 'success'); }
    catch (e) { toast(e.message, 'error'); }
    setConfirm(null);
  };
  const mine = list?.filter(c => !c.sample) || [];
  const samples = list?.filter(c => c.sample) || [];
  return (
    <>
      <div className="page-head">
        <div><h1>Characters</h1><p>Your portraits are private to your account. Delete them any time.</p></div>
        <button className="btn btn-primary" onClick={() => setUpload(true)}><Plus size={17} /> Add character</button>
      </div>
      {!list ? <div className="page-loading"><span className="spinner" /></div> : (
        <>
          <h2 className="section-label" style={{ marginTop: 0 }}>Your characters</h2>
          <div className="char-library">
            <button className="char-card add" onClick={() => setUpload(true)}><Plus /> Upload a portrait</button>
            {mine.map(c => (
              <article key={c.id} className="char-card">
                <img src={c.image} alt={c.name} loading="lazy" />
                <div>
                  <span><b>{c.name}</b><small>Added {dateTime(c.createdAt)}</small></span>
                  <button className="icon-btn" style={{ width: 36, height: 36 }} onClick={() => setConfirm(c)} aria-label={`Delete ${c.name}`}><Trash2 size={16} /></button>
                </div>
              </article>
            ))}
          </div>
          <h2 className="section-label">Sample characters</h2>
          <div className="char-library">
            {samples.map(c => (
              <article key={c.id} className="char-card">
                <img src={c.image} alt={c.name} loading="lazy" />
                <div><span><b>{c.name}</b><small>Sample · free to use</small></span></div>
              </article>
            ))}
          </div>
          <div className="notice" style={{ marginTop: 24, maxWidth: 720 }}><CircleAlert /> <span>For the best results use a sharp, front-facing portrait with soft, even light, one face in frame and nothing covering the eyes or mouth. Only upload portraits you have permission to use.</span></div>
        </>
      )}
      {upload && <UploadCharacterModal onClose={() => setUpload(false)} onCreated={c => setList(l => [c, ...(l || [])])} />}
      {confirm && (
        <Modal title={`Delete ${confirm.name}?`} description="The portrait is permanently removed from our servers." onClose={() => setConfirm(null)}
          actions={<><button className="btn btn-ghost" onClick={() => setConfirm(null)}>Cancel</button><button className="btn btn-danger" onClick={() => remove(confirm)}>Delete</button></>} />
      )}
    </>
  );
}

// ───────────────────────── Billing ─────────────────────────
const KIND_LABEL = { purchase: 'Purchase', usage: 'Live usage', bonus: 'Bonus', adjustment: 'Adjustment' };

export function Billing() {
  useDocumentTitle('Credits');
  const { config, setUser } = useApp();
  const { query, navigate } = useRouter();
  const { buy, busy } = useCheckout();
  const [data, setData] = useState(null);
  useEffect(() => { api('/wallet').then(d => { setData(d); setUser(d.user); }).catch(() => {}); }, [setUser]);
  const pendingPkg = config?.packages.find(p => p.id === query.get('package'));
  const pendingCredits = Number(query.get('credits')) || 0;
  const minutes = data ? Math.round(data.stats.seconds / 60) : 0;
  return (
    <>
      <div className="page-head"><div><h1>Credits</h1><p>One-time purchases in naira. Credits never expire.</p></div></div>

      {(pendingPkg || pendingCredits > 0) && (
        <div className="confirm-buy">
          <span><b>{pendingPkg ? `${pendingPkg.name} · ${fmtCredits(pendingPkg.credits)} credits` : `${fmtCredits(pendingCredits)} credits`}</b>
            <span className="muted"> — {naira(pendingPkg ? pendingPkg.priceKobo : pendingCredits * (config?.pricePerCreditKobo || 0))}</span></span>
          <span style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/billing', { replace: true })}>Dismiss</button>
            <button className="btn btn-primary btn-sm" disabled={!!busy} onClick={() => buy(pendingPkg ? { packageId: pendingPkg.id } : { credits: pendingCredits }, 'pending')}>
              {busy === 'pending' ? <span className="spinner" /> : 'Continue to checkout'}
            </button>
          </span>
        </div>
      )}

      <div className="wallet-hero">
        <div><span>Balance</span><strong>{fmtCredits(data?.user.credits ?? 0)}</strong><small style={{ color: '#c4d2fd' }}>credits available</small></div>
        <div><span>Live takes</span><strong>{data?.stats.sessions ?? '—'}</strong><small>all time</small></div>
        <div><span>Live time</span><strong>{data ? (minutes >= 1 ? `${minutes} min` : `${data.stats.seconds}s`) : '—'}</strong><small>generated</small></div>
        <div><span>Credits used</span><strong>{data ? fmtCredits(data.stats.spent) : '—'}</strong><small>all time</small></div>
      </div>

      {config?.paymentsMode === 'demo' && <div className="notice info" style={{ marginBottom: 16 }}><CircleAlert /> <span><b>Demo payments are on.</b> Purchases are credited instantly without charging a card. Set <code>PAYSTACK_SECRET_KEY</code> to take real payments.</span></div>}
      {config?.paymentsMode === 'disabled' && <div className="notice warn" style={{ marginBottom: 16 }}><CircleAlert /> <span><b>Online payments aren’t set up yet.</b> Contact support to top up your credits.</span></div>}

      <h2 className="section-label" style={{ marginTop: 0 }}>Buy credits</h2>
      <PlanGrid />
      <CustomAmount />

      <h2 className="section-label">History</h2>
      <div className="table-wrap">
        {!data ? <div className="empty"><span className="spinner" style={{ margin: '0 auto' }} /></div> : data.transactions.length === 0 ? (
          <div className="empty">No activity yet. Your purchases and live takes will appear here.</div>
        ) : (
          <table className="table">
            <thead><tr><th>Date</th><th>Activity</th><th>Status</th><th className="num">Amount</th><th className="num">Credits</th></tr></thead>
            <tbody>
              {data.transactions.map(t => (
                <tr key={t.id}>
                  <td className="muted">{dateTime(t.createdAt)}</td>
                  <td><b style={{ fontWeight: 600 }}>{t.description || KIND_LABEL[t.kind]}</b><br /><small className="muted">{KIND_LABEL[t.kind]}{t.reference ? ` · ${t.reference}` : ''}</small></td>
                  <td><span className={`badge ${t.status === 'completed' ? 'ok' : t.status === 'pending' ? 'warn' : 'err'}`}>{t.status === 'pending' && t.kind === 'usage' ? 'live' : t.status}</span></td>
                  <td className="num muted">{t.amount || '—'}</td>
                  <td className={`num ${t.credits > 0 ? 'pos' : 'neg'}`}>{t.status === 'failed' ? '—' : `${t.credits > 0 ? '+' : ''}${fmtCredits(t.credits)}`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

export function BillingCallback() {
  useDocumentTitle('Payment');
  const { query } = useRouter();
  const { setUser } = useApp();
  const reference = query.get('reference') || query.get('trxref');
  const [state, setState] = useState({ status: 'checking' });
  useEffect(() => {
    let tries = 0, stop = false;
    const check = async () => {
      try {
        const { transaction, user } = await api(`/wallet/verify?reference=${encodeURIComponent(reference)}`);
        setUser(user);
        if (transaction.status === 'pending' && tries++ < 8 && !stop) { setState({ status: 'pending', transaction }); setTimeout(check, 2500); return; }
        setState({ status: transaction.status, transaction });
      } catch (err) { setState({ status: 'error', message: err.message }); }
    };
    if (reference) check(); else setState({ status: 'error', message: 'Missing payment reference.' });
    return () => { stop = true; };
  }, [reference, setUser]);
  const t = state.transaction;
  return (
    <div className="panel callback-card">
      {state.status === 'completed' ? (
        <>
          <div className="icon-ring" style={{ color: '#5fd79b' }}><CheckCircle2 /></div>
          <h1>Credits added</h1>
          <p>{fmtCredits(t.credits)} credits are now in your wallet{t.amount ? ` · ${t.amount}` : ''}.</p>
          <Link to="/studio" className="btn btn-primary">Go to studio</Link>
        </>
      ) : state.status === 'checking' || state.status === 'pending' ? (
        <>
          <div className="icon-ring"><span className="spinner" style={{ width: 28, height: 28 }} /></div>
          <h1>Confirming payment…</h1>
          <p>This usually takes a few seconds. Please don’t close this page.</p>
        </>
      ) : (
        <>
          <div className="icon-ring" style={{ color: '#ff9c9c' }}><CircleAlert /></div>
          <h1>{state.status === 'failed' ? 'Payment not completed' : 'We couldn’t confirm that payment'}</h1>
          <p>{state.message || 'No money was taken for credits that weren’t added. If you were charged, contact support with your reference.'}</p>
          {reference && <p className="muted" style={{ fontFamily: 'var(--mono)', fontSize: 13 }}>{reference}</p>}
          <Link to="/billing" className="btn btn-primary">Back to credits</Link>
        </>
      )}
    </div>
  );
}

// ───────────────────────── Account ─────────────────────────
export function Account() {
  useDocumentTitle('Account');
  const { user, setUser, logout } = useApp();
  const { navigate } = useRouter();
  const toast = useToast();
  const [name, setName] = useState(user?.name || '');
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [busy, setBusy] = useState('');
  const [history, setHistory] = useState(null);
  useEffect(() => { api('/live/history').then(r => setHistory(r.sessions)).catch(() => setHistory([])); }, []);
  const saveName = async e => {
    e.preventDefault(); setBusy('name');
    try { const r = await api('/auth/profile', { method: 'POST', body: { name } }); setUser(r.user); toast('Profile updated.', 'success'); } catch (err) { toast(err.message, 'error'); }
    setBusy('');
  };
  const savePw = async e => {
    e.preventDefault(); setBusy('pw');
    try { await api('/auth/password', { method: 'POST', body: pw }); setPw({ currentPassword: '', newPassword: '' }); toast('Password changed. Other devices were signed out.', 'success'); } catch (err) { toast(err.message, 'error'); }
    setBusy('');
  };
  return (
    <>
      <div className="page-head"><div><h1>Account</h1><p>{user?.email} · member since {user && dateTime(user.createdAt).split(',')[0]}</p></div>
        <button className="btn btn-light" onClick={async () => { await logout(); navigate('/'); }}>Sign out</button></div>
      <div className="two-col">
        <section className="panel">
          <div className="panel-title"><h2>Profile</h2></div>
          <form className="form-grid" onSubmit={saveName}>
            <label className="field"><span>Name</span><input className="input" value={name} onChange={e => setName(e.target.value)} required /></label>
            <label className="field"><span>Email</span><input className="input" value={user?.email || ''} disabled /></label>
            <div><button className="btn btn-primary" disabled={busy === 'name'}>{busy === 'name' ? <span className="spinner" /> : 'Save'}</button></div>
          </form>
        </section>
        <section className="panel" style={{ marginTop: 0 }}>
          <div className="panel-title"><h2>Password</h2></div>
          <form className="form-grid" onSubmit={savePw}>
            <label className="field"><span>Current password</span><input className="input" type="password" autoComplete="current-password" value={pw.currentPassword} onChange={e => setPw({ ...pw, currentPassword: e.target.value })} required /></label>
            <label className="field"><span>New password</span><input className="input" type="password" autoComplete="new-password" minLength={8} value={pw.newPassword} onChange={e => setPw({ ...pw, newPassword: e.target.value })} required /></label>
            <div><button className="btn btn-primary" disabled={busy === 'pw'}>{busy === 'pw' ? <span className="spinner" /> : 'Change password'}</button></div>
          </form>
        </section>
      </div>
      <h2 className="section-label">Recent live takes</h2>
      <div className="table-wrap">
        {!history ? <div className="empty"><span className="spinner" style={{ margin: '0 auto' }} /></div> : history.length === 0 ? <div className="empty">No live takes yet.</div> : (
          <table className="table">
            <thead><tr><th>Started</th><th>Model</th><th>Duration</th><th>Ended</th><th className="num">Reserved</th><th className="num">Used</th></tr></thead>
            <tbody>{history.map(s => (
              <tr key={s.id}>
                <td className="muted">{dateTime(s.startedAt)}</td>
                <td style={{ textTransform: 'capitalize' }}>{s.model}</td>
                <td className="tabular"><Clock size={13} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 6 }} />{clock(s.billedSeconds)}</td>
                <td><span className="badge">{(s.endReason || s.status).replace(/_/g, ' ')}</span></td>
                <td className="num muted">{fmtCredits(s.reserved)}</td>
                <td className="num">{fmtCredits(s.charged)}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </>
  );
}

// ───────────────────────── Admin ─────────────────────────
export function Admin() {
  useDocumentTitle('Admin');
  const toast = useToast();
  const [ov, setOv] = useState(null);
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState('');
  const [adjust, setAdjust] = useState(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const load = useCallback(() => { api('/admin/overview').then(setOv).catch(e => toast(e.message, 'error')); }, [toast]);
  const loadUsers = useCallback(query => api(`/admin/users?q=${encodeURIComponent(query)}`).then(r => setUsers(r.users)).catch(() => {}), []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { const t = setTimeout(() => loadUsers(q), 250); return () => clearTimeout(t); }, [q, loadUsers]);
  const submitAdjust = async () => {
    try {
      await api(`/admin/users/${adjust.id}/credits`, { method: 'POST', body: { amount: Number(amount), note } });
      toast('Credits updated.', 'success'); setAdjust(null); setAmount(''); setNote(''); loadUsers(q); load();
    } catch (e) { toast(e.message, 'error'); }
  };
  const toggle = async u => {
    try { await api(`/admin/users/${u.id}/status`, { method: 'POST', body: { disabled: !u.disabled } }); loadUsers(q); } catch (e) { toast(e.message, 'error'); }
  };
  return (
    <>
      <div className="page-head"><div><h1>Admin</h1><p>Operations overview, users and credits.</p></div><button className="btn btn-light" onClick={load}>Refresh</button></div>
      {ov && (
        <>
          <div className="stat-grid">
            <div><span>Revenue</span><strong>{ov.revenue}</strong></div>
            <div><span>Users</span><strong>{ov.users}</strong></div>
            <div><span>New (7 days)</span><strong>{ov.newUsers7d}</strong></div>
            <div><span>Credits sold</span><strong>{fmtCredits(ov.creditsSold)}</strong></div>
            <div><span>Credits used</span><strong>{fmtCredits(ov.creditsUsed)}</strong></div>
            <div><span>Live minutes</span><strong>{ov.liveMinutes}</strong></div>
            <div><span>Live now</span><strong>{ov.activeSessions}</strong></div>
          </div>
          <div className="two-col" style={{ marginBottom: 8 }}>
            <div className={`notice ${ov.engine.available ? 'info' : 'warn'}`}><Wallet /> <span><b>Live engine: {ov.engine.mode}</b> — {ov.engine.detail}</span></div>
            <div className={`notice ${ov.paymentsMode === 'paystack' ? 'info' : 'warn'}`}><Coins /> <span><b>Payments: {ov.paymentsMode}</b> — {ov.paymentsMode === 'paystack' ? 'Paystack is live. Webhook: /api/paystack/webhook' : ov.paymentsMode === 'demo' ? 'Demo mode credits purchases instantly. Turn off before launch.' : 'Set PAYSTACK_SECRET_KEY to accept payments.'}</span></div>
          </div>
        </>
      )}
      <div className="page-head" style={{ marginTop: 28, marginBottom: 14 }}>
        <h2 style={{ fontSize: 18 }}>Users</h2>
        <label className="search"><Search /><input className="input" placeholder="Search name or email" value={q} onChange={e => setQ(e.target.value)} /></label>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>User</th><th>Joined</th><th>Role</th><th className="num">Credits</th><th className="num">Actions</th></tr></thead>
          <tbody>{users.map(u => (
            <tr key={u.id}>
              <td><b style={{ fontWeight: 600 }}>{u.name}</b><br /><small className="muted">{u.email}</small></td>
              <td className="muted">{dateTime(u.createdAt)}</td>
              <td>{u.isAdmin ? <span className="badge info">admin</span> : u.disabled ? <span className="badge err">disabled</span> : <span className="badge">user</span>}</td>
              <td className="num">{fmtCredits(u.credits)}</td>
              <td className="num" style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                <button className="btn btn-light btn-sm" onClick={() => setAdjust(u)}>Adjust credits</button>
                {!u.isAdmin && <button className="btn btn-ghost btn-sm" onClick={() => toggle(u)}>{u.disabled ? 'Enable' : 'Disable'}</button>}
              </td>
            </tr>
          ))}</tbody>
        </table>
        {users.length === 0 && <div className="empty">No users found.</div>}
      </div>
      {ov?.recentPurchases?.length > 0 && (
        <>
          <h2 className="section-label">Recent purchases</h2>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Date</th><th>User</th><th>Reference</th><th>Status</th><th className="num">Amount</th><th className="num">Credits</th></tr></thead>
              <tbody>{ov.recentPurchases.map(p => (
                <tr key={p.id}><td className="muted">{dateTime(p.createdAt)}</td><td>{p.email}</td><td className="muted" style={{ fontFamily: 'var(--mono)', fontSize: 12.5 }}>{p.reference}</td>
                  <td><span className={`badge ${p.status === 'completed' ? 'ok' : p.status === 'pending' ? 'warn' : 'err'}`}>{p.status}</span></td>
                  <td className="num">{p.amount}</td><td className="num">{fmtCredits(p.credits)}</td></tr>
              ))}</tbody>
            </table>
          </div>
        </>
      )}
      {adjust && (
        <Modal title={`Adjust credits · ${adjust.name}`} description={`Current balance: ${fmtCredits(adjust.credits)} credits. Use a negative number to remove credits.`} onClose={() => setAdjust(null)}
          actions={<><button className="btn btn-ghost" onClick={() => setAdjust(null)}>Cancel</button><button className="btn btn-primary" disabled={!Number(amount)} onClick={submitAdjust}>Apply</button></>}>
          <div className="modal-body">
            <label className="field"><span>Credits</span><input className="input" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 100 or -50" /></label>
            <label className="field"><span>Note (shown in the user’s history)</span><input className="input" value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Bank transfer top-up" /></label>
          </div>
        </Modal>
      )}
    </>
  );
}
