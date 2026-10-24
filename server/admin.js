import { Router } from 'express';
import { db, tx } from './db.js';
import { publicUser, requireAdmin } from './auth.js';
import { engineStatus, activeRuns } from './live.js';
import { config } from './config.js';
import { HttpError, formatNaira, wrap } from './util.js';

export const adminRouter = Router();
adminRouter.use(requireAdmin);

adminRouter.get('/overview', wrap(async (_req, res) => {
  const one = sql => db.prepare(sql).get();
  const revenue = one(`SELECT COALESCE(SUM(amount_kobo),0) v FROM transactions WHERE kind='purchase' AND status='completed'`).v;
  res.json({
    users: one('SELECT COUNT(*) v FROM users').v,
    newUsers7d: one(`SELECT COUNT(*) v FROM users WHERE created_at > datetime('now','-7 days')`).v,
    revenueKobo: revenue, revenue: formatNaira(revenue),
    creditsSold: one(`SELECT COALESCE(SUM(credits),0) v FROM transactions WHERE kind='purchase' AND status='completed'`).v,
    creditsUsed: one(`SELECT COALESCE(SUM(charged),0) v FROM live_sessions WHERE status='ended'`).v,
    liveMinutes: Math.round(one(`SELECT COALESCE(SUM(billed_seconds),0) v FROM live_sessions`).v / 60),
    activeSessions: activeRuns(),
    engine: await engineStatus(true),
    paymentsMode: config.payments.mode,
    recentPurchases: db.prepare(`SELECT t.*, u.email FROM transactions t JOIN users u ON u.id=t.user_id
      WHERE t.kind='purchase' ORDER BY t.id DESC LIMIT 12`).all()
      .map(t => ({ id: t.id, email: t.email, credits: t.credits, amount: formatNaira(t.amount_kobo), status: t.status, reference: t.reference, createdAt: t.created_at })),
  });
}));

adminRouter.get('/users', (req, res) => {
  const q = `%${String(req.query.q || '').trim()}%`;
  const rows = db.prepare(`SELECT * FROM users WHERE email LIKE ? OR name LIKE ? ORDER BY id DESC LIMIT 100`).all(q, q);
  res.json({ users: rows.map(u => ({ ...publicUser(u), disabled: !!u.disabled })) });
});

adminRouter.post('/users/:id/credits', wrap((req, res) => {
  const amount = Math.round(Number(req.body?.amount) * 100) / 100;
  const note = String(req.body?.note || '').trim().slice(0, 120) || 'Manual adjustment';
  if (!Number.isFinite(amount) || amount === 0) throw new HttpError(400, 'Enter a non-zero credit amount.');
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) throw new HttpError(404, 'User not found.');
  if (user.credits + amount < 0) throw new HttpError(400, 'That would make the balance negative.');
  tx(() => {
    db.prepare('UPDATE users SET credits = credits + ? WHERE id = ?').run(amount, user.id);
    db.prepare(`INSERT INTO transactions (user_id, kind, status, credits, description, meta) VALUES (?, 'adjustment', 'completed', ?, ?, ?)`)
      .run(user.id, amount, note, JSON.stringify({ by: req.user.email }));
  })();
  res.json({ user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(user.id)) });
}));

adminRouter.post('/users/:id/status', wrap((req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) throw new HttpError(404, 'User not found.');
  if (user.id === req.user.id) throw new HttpError(400, 'You can’t disable your own account.');
  const disabled = req.body?.disabled ? 1 : 0;
  db.prepare('UPDATE users SET disabled = ? WHERE id = ?').run(disabled, user.id);
  if (disabled) db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id);
  res.json({ ok: true });
}));
