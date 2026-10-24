import React, { useState } from 'react';
import { Check, Plus } from 'lucide-react';
import { Link, api, credits as fmtCredits, naira, nairaExact, useApp, useDocumentTitle, useRouter, useToast } from '../lib/core.jsx';

/** Start checkout for a package or a custom amount. Shared by pricing + billing pages. */
export function useCheckout() {
  const { user } = useApp();
  const { navigate } = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(null);
  const buy = async (payload, key) => {
    if (!user) {
      const q = payload.packageId ? `package=${payload.packageId}` : `credits=${payload.credits}`;
      return navigate(`/register?${q}`);
    }
    setBusy(key);
    try {
      const { url } = await api('/wallet/checkout', { method: 'POST', body: payload });
      if (url.startsWith(window.location.origin)) navigate(url.slice(window.location.origin.length));
      else window.location.assign(url);
    } catch (err) {
      toast(err.message, 'error');
      setBusy(null);
    }
  };
  return { buy, busy };
}

export function PlanGrid() {
  const { config } = useApp();
  const { buy, busy } = useCheckout();
  if (!config) return null;
  return (
    <div className="pricing-grid">
      {config.packages.map(p => (
        <article key={p.id} className={`card plan${p.recommended ? ' recommended' : ''}`}>
          <div className="plan-tag"><span>Studio credits</span>{p.recommended && <b>Recommended</b>}</div>
          <h2>{p.name}</h2>
          <p className="plan-blurb">{p.blurb}</p>
          <p className="plan-credits">{fmtCredits(p.credits)} credits</p>
          <p className="plan-price tabular">{naira(p.priceKobo)}</p>
          <p className="plan-rate muted tabular">{nairaExact(p.priceKobo / p.credits)} per credit</p>
          <button className="btn btn-primary btn-block" disabled={busy === p.id} onClick={() => buy({ packageId: p.id }, p.id)}>
            {busy === p.id ? <span className="spinner" /> : `Choose ${p.name}`}
          </button>
        </article>
      ))}
    </div>
  );
}

export function CustomAmount() {
  const { config } = useApp();
  const { buy, busy } = useCheckout();
  const cc = config?.customCredits || { min: 601, max: 60000, default: 1200 };
  const [qty, setQty] = useState(String(cc.default));
  if (!config) return null;
  const n = Math.floor(Number(qty) || 0);
  const valid = n >= cc.min && n <= cc.max;
  return (
    <section className="card custom-card" aria-labelledby="custom-title">
      <div>
        <p className="kicker">Your amount. Your next idea.</p>
        <h2 id="custom-title">Need more than {fmtCredits(cc.min - 1)}?</h2>
        <p>Choose exactly how many credits you need, at the same rate. {nairaExact(config.pricePerCreditKobo)} per credit · no subscription.</p>
      </div>
      <form className="custom-form" onSubmit={e => { e.preventDefault(); if (valid) buy({ credits: n }, 'custom'); }}>
        <label className="field">
          <span>How many credits?</span>
          <div className="qty">
            <input type="number" inputMode="numeric" min={cc.min} max={cc.max} step="1" value={qty} onChange={e => setQty(e.target.value)} aria-describedby="qty-help" />
            <span>credits</span>
          </div>
          <small id="qty-help">{fmtCredits(cc.min)}–{fmtCredits(cc.max)} credits per purchase.</small>
        </label>
        <div className="total-row"><span className="muted">Credit total</span><strong className="tabular">{valid ? nairaExact(n * config.pricePerCreditKobo) : '—'}</strong></div>
        <button className="btn btn-primary btn-block" disabled={!valid || busy === 'custom'}>
          {busy === 'custom' ? <span className="spinner" /> : 'Continue with this amount'}
        </button>
        <small className="muted">Any processing fee is shown at checkout.</small>
      </form>
    </section>
  );
}

export function Faq({ items }) {
  return (
    <div className="faq-list">
      {items.map(([q, a], i) => (
        <details key={i}>
          <summary>{q}<Plus /></summary>
          <div>{a}</div>
        </details>
      ))}
    </div>
  );
}

export default function Pricing() {
  useDocumentTitle('Pricing in naira');
  const { config } = useApp();
  const models = config?.models || [];
  const support = config?.links?.email ? `mailto:${config.links.email}` : config?.links?.whatsapp ? `https://wa.me/${config.links.whatsapp}` : '/how-it-works';
  return (
    <>
      <section className="page-hero shell">
        <p className="kicker">One-time purchase · NGN</p>
        <h1>Find your <span>creative pace.</span></h1>
        <p>Camera preview is always free. Buy credits once, use them whenever you go live. No subscription.</p>
      </section>
      <div className="shell">
        <PlanGrid />
        <CustomAmount />
        <section className="card tools-row">
          <ul>
            <li><Check /> Live character transformation</li>
            <li><Check /> Live character switching</li>
            <li><Check /> Browser recording</li>
            <li><Check /> Paystack checkout</li>
          </ul>
          <p>{models.map(m => `${m.name}: ${m.creditsPerSecond} credit${m.creditsPerSecond === 1 ? '' : 's'} per second`).join(' · ')}. Same wallet for every model.</p>
        </section>

        <section className="section faq" id="faq">
          <div className="faq-intro">
            <p className="kicker">Before you create</p>
            <h2>Clear from <span>the first credit.</span></h2>
            <p>Need a hand? <Link to={support}>Talk to us</Link></p>
          </div>
          <Faq items={[
            ['How are my credits used?', 'When you go live, the studio reserves credits up to your limit. Usage is counted per second while AI frames are streaming and rounded up to a whole credit. Stop early and the unused reserved credits return to your wallet immediately. Set a credit limit before each take to stay in control.'],
            ['Can I try the camera before paying?', 'Yes. Camera preview is free and private. You only need credits when you start a live transformation. Try a short take first to check your character.'],
            ['How do I pay? Are there extra fees?', 'Choose a pack and pay in naira through Paystack with card, bank transfer or USSD. Any processing fee is shown at checkout. It is a one-time purchase, not a recurring subscription.'],
            ['Do credits expire?', 'No. Credits stay in your wallet until you use them.'],
            ['What can I create with these credits?', <>Turn your live camera into a character, switch characters mid-take and record the generated output in supported browsers. These packs are for live character transformation, not text-to-video or voice conversion. <Link to="/how-it-works">See how it works</Link>.</>],
          ]} />
        </section>
      </div>
    </>
  );
}
