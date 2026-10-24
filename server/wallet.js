import { Router } from 'express';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { config } from './config.js';
import { db, tx } from './db.js';
import { publicUser, requireAuth } from './auth.js';
import { HttpError, formatNaira, newId, wrap } from './util.js';

const site = config.site;

export function siteOrigin(req) {
  return config.publicUrl || `${req.protocol}://${req.get('host')}`;
}

function quote({ packageId, credits }) {
  if (packageId) {
    const pkg = site.packages.find(p => p.id === packageId);
    if (!pkg) throw new HttpError(400, 'That package is no longer available.');
    return { credits: pkg.credits, amountKobo: pkg.priceKobo, label: pkg.name, packageId: pkg.id };
  }
  const n = Math.floor(Number(credits));
  const { min, max } = site.customCredits;
  if (!Number.isFinite(n) || n < min || n > max) {
    throw new HttpError(400, `Choose between ${min.toLocaleString()} and ${max.toLocaleString()} credits.`);
  }
  return { credits: n, amountKobo: n * site.pricePerCreditKobo, label: `${n.toLocaleString()} credits`, packageId: 'custom' };
}

/** Idempotently credit a pending purchase. Returns the transaction row. */
export function completePurchase(reference, paidKobo, source) {
  return tx(() => {
    const row = db.prepare('SELECT * FROM transactions WHERE reference = ?').get(reference);
    if (!row) return null;
    if (row.status !== 'pending') return row;
    if (paidKobo < row.amount_kobo) {
      db.prepare(`UPDATE transactions SET status='failed', updated_at=datetime('now'), meta=json_set(meta,'$.failure','amount_mismatch') WHERE id=?`).run(row.id);
      return db.prepare('SELECT * FROM transactions WHERE id = ?').get(row.id);
    }
    db.prepare(`UPDATE transactions SET status='completed', updated_at=datetime('now'), meta=json_set(meta,'$.confirmedBy',?) WHERE id=?`).run(source, row.id);
    db.prepare('UPDATE users SET credits = credits + ? WHERE id = ?').run(row.credits, row.user_id);
    return db.prepare('SELECT * FROM transactions WHERE id = ?').get(row.id);
  })();
}

async function paystack(path, init = {}) {
  const res = await fetch(config.payments.paystackBase + path, {
    ...init,
    headers: { Authorization: `Bearer ${config.payments.paystackSecret}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
    signal: AbortSignal.timeout(20_000),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.status === false) {
    throw new HttpError(502, body.message ? `Paystack: ${body.message}` : 'Could not reach Paystack. Please try again.');
  }
  return body.data;
}

const txDto = t => ({
  id: t.id, kind: t.kind, status: t.status, credits: t.credits, amountKobo: t.amount_kobo,
  amount: t.amount_kobo ? formatNaira(t.amount_kobo) : null, reference: t.reference,
  description: t.description, createdAt: t.created_at,
});

export const walletRouter = Router();
walletRouter.use(requireAuth);

walletRouter.get('/', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  const transactions = db.prepare('SELECT * FROM transactions WHERE user_id = ? ORDER BY id DESC LIMIT 100').all(req.user.id).map(txDto);
  const stats = db.prepare(`SELECT COUNT(*) sessions, COALESCE(SUM(billed_seconds),0) seconds, COALESCE(SUM(charged),0) spent
    FROM live_sessions WHERE user_id = ? AND status = 'ended'`).get(req.user.id);
  res.json({ user: publicUser(user), transactions, stats });
});

walletRouter.post('/checkout', wrap(async (req, res) => {
  if (config.payments.mode === 'disabled') {
    throw new HttpError(503, 'Payments are not configured yet. Please contact support to buy credits.');
  }
  const q = quote(req.body || {});
  const reference = newId('fh', 10).replace(/[^A-Za-z0-9_-]/g, '');
  db.prepare(`INSERT INTO transactions (user_id, kind, status, credits, amount_kobo, reference, description, meta)
    VALUES (?, 'purchase', 'pending', ?, ?, ?, ?, ?)`)
    .run(req.user.id, q.credits, q.amountKobo, reference, `${q.label} purchase`, JSON.stringify({ packageId: q.packageId, provider: config.payments.mode }));

  const callback = `${siteOrigin(req)}/billing/callback?reference=${encodeURIComponent(reference)}`;
  if (config.payments.mode === 'demo') {
    completePurchase(reference, q.amountKobo, 'demo');
    return res.json({ url: callback, reference });
  }
  const data = await paystack('/transaction/initialize', {
    method: 'POST',
    body: JSON.stringify({
      email: req.user.email, amount: q.amountKobo, currency: site.currency, reference, callback_url: callback,
      metadata: { user_id: req.user.id, credits: q.credits, package: q.packageId, cancel_action: `${siteOrigin(req)}/pricing` },
    }),
  });
  res.json({ url: data.authorization_url, reference });
}));

walletRouter.get('/verify', wrap(async (req, res) => {
  const reference = String(req.query.reference || '');
  let row = db.prepare('SELECT * FROM transactions WHERE reference = ? AND user_id = ?').get(reference, req.user.id);
  if (!row) throw new HttpError(404, 'We couldn’t find that payment.');
  if (row.status === 'pending' && config.payments.mode === 'paystack') {
    const data = await paystack(`/transaction/verify/${encodeURIComponent(reference)}`);
    if (data.status === 'success') row = completePurchase(reference, Number(data.amount), 'verify');
    else if (['failed', 'abandoned', 'reversed'].includes(data.status)) {
      db.prepare(`UPDATE transactions SET status='failed', updated_at=datetime('now') WHERE id=? AND status='pending'`).run(row.id);
      row = db.prepare('SELECT * FROM transactions WHERE id = ?').get(row.id);
    }
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json({ transaction: txDto(row), user: publicUser(user) });
}));

/** Paystack webhook. Mounted with a raw body parser so the signature can be checked. */
export function paystackWebhook(req, res) {
  const secret = config.payments.paystackSecret;
  const signature = String(req.headers['x-paystack-signature'] || '');
  if (!secret || !Buffer.isBuffer(req.body)) return res.status(400).end();
  const expected = createHmac('sha512', secret).update(req.body).digest('hex');
  const ok = signature.length === expected.length && timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  if (!ok) return res.status(401).end();
  let event;
  try { event = JSON.parse(req.body.toString('utf8')); } catch { return res.status(400).end(); }
  if (event?.event === 'charge.success' && event.data?.reference) {
    completePurchase(String(event.data.reference), Number(event.data.amount), 'webhook');
  }
  res.status(200).json({ received: true });
}
