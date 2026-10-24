// Live generation: credit reservation, per-second metering and frame relay
// between the browser studio and the GPU worker.
//
//   browser ──JPEG frames──▶ /ws/live ──▶ GPU worker (/sessions/:id/stream)
//   browser ◀──rendered────  /ws/live ◀──  GPU worker
//
// Billing rule (matches the pricing page): credits are reserved up front,
// usage is counted per second while rendered frames are flowing, rounded up to
// a whole credit at the end, and anything unused returns to the wallet.
import { Router } from 'express';
import WebSocket, { WebSocketServer } from 'ws';
import { config } from './config.js';
import { db, tx } from './db.js';
import { publicUser, requireAuth, userFromCookieHeader } from './auth.js';
import { loadCharacterImage } from './characters.js';
import { HttpError, newId, wrap } from './util.js';

const MIN_SECONDS = 5;            // must be able to afford at least this much
const CONNECT_TIMEOUT_MS = 60_000; // reserved session must connect within this
const STALL_MS = 4_000;           // no rendered frame for this long → billing pauses
const runs = new Map();           // sessionId → LiveRun

// ───────────────────────── engine adapters ─────────────────────────

const workerHeaders = () => (config.engine.workerToken ? { Authorization: `Bearer ${config.engine.workerToken}` } : {});

let healthCache = { at: 0, value: null };
export async function engineStatus(force = false) {
  const { mode, workerUrl } = config.engine;
  if (mode === 'none') return { mode, available: false, detail: 'No live engine is configured. Set GPU_WORKER_URL (or TEST_ENGINE=true for a test run).' };
  if (mode === 'test') return { mode, available: true, detail: 'Test engine: frames pass through unchanged so you can verify the full flow. No AI is applied.' };
  if (!force && Date.now() - healthCache.at < 10_000 && healthCache.value) return healthCache.value;
  let value;
  try {
    const res = await fetch(`${workerUrl}/health`, { headers: workerHeaders(), signal: AbortSignal.timeout(4000) });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.detail || `HTTP ${res.status}`);
    value = body.modelLoaded
      ? { mode, available: true, detail: `GPU engine online (${body.provider || 'gpu'}).`, worker: body }
      : { mode, available: false, detail: body.error || 'GPU worker is online but the face model is not loaded yet.', worker: body };
  } catch (err) {
    value = { mode, available: false, detail: `GPU engine unreachable: ${err.message}` };
  }
  healthCache = { at: Date.now(), value };
  return value;
}

class TestEngine {
  constructor(onFrame) { this.onFrame = onFrame; }
  async open() {}
  async setCharacter() {}
  send(frame) { setTimeout(() => this.onFrame(frame), 15); }
  control() {}
  close() {}
}

class WorkerEngine {
  constructor(onFrame, onError, profile) {
    this.onFrame = onFrame; this.onError = onError; this.profile = profile;
    this.ws = null; this.sid = null; this.closed = false;
  }
  async api(path, init = {}) {
    const res = await fetch(config.engine.workerUrl + path, { ...init, headers: { ...workerHeaders(), ...(init.headers || {}) }, signal: AbortSignal.timeout(30_000) });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.detail || body.error || `GPU worker HTTP ${res.status}`);
    return body;
  }
  async open(image) {
    const created = await this.api('/sessions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mouthMask: !!this.profile.mouthMask }),
    });
    this.sid = created.sessionId;
    await this.setCharacter(image);
    const wsUrl = config.engine.workerUrl.replace(/^http/, 'ws') + `/sessions/${this.sid}/stream`;
    await new Promise((resolve, reject) => {
      const ws = new WebSocket(wsUrl, { headers: workerHeaders(), maxPayload: 8 * 1024 * 1024 });
      ws.binaryType = 'nodebuffer';
      const t = setTimeout(() => { ws.terminate(); reject(new Error('GPU worker stream timed out.')); }, 15_000);
      ws.once('open', () => { clearTimeout(t); resolve(); });
      ws.once('error', err => { clearTimeout(t); reject(err); });
      ws.on('message', (data, isBinary) => {
        if (isBinary) return this.onFrame(data);
        try { const msg = JSON.parse(data.toString()); if (msg.type === 'error') this.onError(msg.message); } catch { /* ignore */ }
      });
      ws.on('close', () => { if (!this.closed) this.onError('The GPU engine closed the stream.'); });
      this.ws = ws;
    });
  }
  async setCharacter(image) {
    const form = new FormData();
    form.append('source', new Blob([image.bytes], { type: image.mime }), 'character');
    await this.api(`/sessions/${this.sid}/source`, { method: 'POST', body: form });
  }
  send(frame) {
    // Drop frames if the worker link is congested; freshness beats completeness.
    if (this.ws?.readyState === WebSocket.OPEN && this.ws.bufferedAmount < 1_500_000) this.ws.send(frame, { binary: true });
  }
  control(msg) { if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg)); }
  close() {
    this.closed = true;
    try { this.ws?.close(); } catch { /* ignore */ }
    if (this.sid) this.api(`/sessions/${this.sid}`, { method: 'DELETE' }).catch(() => {});
  }
}

// ───────────────────────── billing ─────────────────────────

const fmtDuration = s => (s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`);

/** Settle a live session: charge used credits (rounded up), refund the rest. Idempotent. */
export function finalizeSession(sessionId, reason) {
  return tx(() => {
    const s = db.prepare('SELECT * FROM live_sessions WHERE id = ?').get(sessionId);
    if (!s) return null;
    if (s.status === 'ended') return s;
    const charged = Math.min(s.reserved, Math.ceil(s.billed_seconds * s.rate - 1e-9));
    const refund = s.reserved - charged;
    const model = config.site.models.find(m => m.id === s.model)?.name || s.model;
    db.prepare(`UPDATE live_sessions SET status='ended', charged=?, end_reason=?, ended_at=datetime('now') WHERE id=?`).run(charged, reason, s.id);
    db.prepare(`UPDATE transactions SET status='completed', credits=?, description=?, updated_at=datetime('now') WHERE id=?`)
      .run(-charged, `Live · ${model} · ${fmtDuration(s.billed_seconds)}`, s.transaction_id);
    if (refund > 0) db.prepare('UPDATE users SET credits = credits + ? WHERE id = ?').run(refund, s.user_id);
    return db.prepare('SELECT * FROM live_sessions WHERE id = ?').get(s.id);
  })();
}

const sessionDto = s => s && ({
  id: s.id, model: s.model, rate: s.rate, reserved: s.reserved, billedSeconds: s.billed_seconds,
  charged: s.charged, status: s.status, endReason: s.end_reason, startedAt: s.started_at, endedAt: s.ended_at,
});

// Settle anything left open by a previous crash/restart.
for (const s of db.prepare(`SELECT id FROM live_sessions WHERE status != 'ended'`).all()) finalizeSession(s.id, 'server_restart');

// ───────────────────────── live run (one per connected session) ─────────────────────────

class LiveRun {
  constructor(session, user, client) {
    this.s = session; this.user = user; this.client = client;
    this.billed = session.billed_seconds; this.lastOutput = 0; this.ended = false; this.live = false;
    const model = config.site.models.find(m => m.id === session.model);
    const onFrame = buf => this.deliver(buf);
    const onError = msg => this.end('engine_error', msg);
    this.engine = session.engine === 'worker' ? new WorkerEngine(onFrame, onError, model?.profile || {}) : new TestEngine(onFrame);
  }
  sendJson(msg) { if (this.client.readyState === WebSocket.OPEN) this.client.send(JSON.stringify(msg)); }
  async start() {
    try {
      const image = loadCharacterImage(this.user.id, this.s.character_id);
      this.sendJson({ type: 'status', message: 'Loading your character…' });
      await this.engine.open(image);
      if (this.ended) return this.engine.close();
      this.sendJson({ type: 'ready', engine: this.s.engine, rate: this.s.rate, reserved: this.s.reserved });
      this.timer = setInterval(() => this.tick(), 1000);
    } catch (err) {
      this.end('engine_error', err.message || 'Could not start the live engine.');
    }
  }
  deliver(buf) {
    if (this.ended) return;
    this.lastOutput = Date.now();
    if (!this.live) {
      this.live = true;
      db.prepare(`UPDATE live_sessions SET status='live' WHERE id=?`).run(this.s.id);
    }
    if (this.client.readyState === WebSocket.OPEN) this.client.send(buf, { binary: true });
  }
  tick() {
    if (this.ended) return;
    const flowing = this.live && Date.now() - this.lastOutput < STALL_MS;
    if (flowing) {
      this.billed += 1;
      db.prepare('UPDATE live_sessions SET billed_seconds=? WHERE id=?').run(this.billed, this.s.id);
    }
    const used = Math.ceil(this.billed * this.s.rate - 1e-9);
    this.sendJson({ type: 'tick', seconds: this.billed, used, remaining: Math.max(0, this.s.reserved - used), paused: this.live && !flowing });
    if (used >= this.s.reserved || (this.billed + 1) * this.s.rate > this.s.reserved + 1e-9) this.end('limit', 'Your credit limit for this take was reached.');
  }
  onClientMessage(data, isBinary) {
    if (this.ended) return;
    if (isBinary) return this.engine.send(data);
    let msg; try { msg = JSON.parse(data.toString()); } catch { return; }
    if (msg.type === 'stop') this.end('user');
    else if (msg.type === 'settings') this.engine.control({ type: 'settings', mouthMask: !!msg.mouthMask, sharpness: Number(msg.sharpness) || 0 });
    else if (msg.type === 'character' && msg.characterId) {
      Promise.resolve()
        .then(() => this.engine.setCharacter(loadCharacterImage(this.user.id, String(msg.characterId))))
        .then(() => this.sendJson({ type: 'character', characterId: msg.characterId }))
        .catch(err => this.sendJson({ type: 'notice', message: err.message || 'Could not switch character.' }));
    }
  }
  end(reason, message) {
    if (this.ended) return;
    this.ended = true;
    clearInterval(this.timer);
    this.engine.close();
    const done = finalizeSession(this.s.id, reason);
    runs.delete(this.s.id);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(this.user.id);
    this.sendJson({ type: 'ended', reason, message, session: sessionDto(done), user: publicUser(user) });
    setTimeout(() => { try { this.client.close(1000); } catch { /* ignore */ } }, 50);
  }
}

// ───────────────────────── HTTP routes ─────────────────────────

export const liveRouter = Router();
liveRouter.use(requireAuth);

liveRouter.get('/engine', wrap(async (req, res) => res.json(await engineStatus(req.query.refresh === '1'))));

liveRouter.post('/start', wrap(async (req, res) => {
  const status = await engineStatus();
  if (!status.available) throw new HttpError(503, status.detail);
  const model = config.site.models.find(m => m.id === req.body?.model) || config.site.models[0];
  const characterId = String(req.body?.characterId || '');
  loadCharacterImage(req.user.id, characterId); // validates access

  // One live take per account at a time: settle any previous one first.
  for (const open of db.prepare(`SELECT id FROM live_sessions WHERE user_id=? AND status!='ended'`).all(req.user.id)) {
    const run = runs.get(open.id);
    if (run) run.end('replaced'); else finalizeSession(open.id, 'replaced');
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  const minNeeded = Math.ceil(model.creditsPerSecond * MIN_SECONDS);
  const limit = Number(req.body?.creditLimit) > 0 ? Math.floor(Number(req.body.creditLimit)) : Infinity;
  const reserve = Math.floor(Math.min(user.credits, limit));
  if (user.credits < minNeeded) throw new HttpError(402, `You need at least ${minNeeded} credits to go live with ${model.name}. Top up to continue.`, { code: 'insufficient_credits' });
  if (reserve < minNeeded) throw new HttpError(400, `Set a credit limit of at least ${minNeeded} credits.`);

  const id = newId('live', 10);
  tx(() => {
    db.prepare('UPDATE users SET credits = credits - ? WHERE id = ?').run(reserve, user.id);
    const txId = db.prepare(`INSERT INTO transactions (user_id, kind, status, credits, description, meta) VALUES (?, 'usage', 'pending', ?, ?, ?)`)
      .run(user.id, -reserve, `Live · ${model.name} · in progress`, JSON.stringify({ sessionId: id })).lastInsertRowid;
    db.prepare(`INSERT INTO live_sessions (id, user_id, transaction_id, character_id, model, rate, reserved, engine) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(id, user.id, txId, characterId, model.id, model.creditsPerSecond, reserve, config.engine.mode);
  })();

  // Release the hold if the browser never connects.
  setTimeout(() => {
    const s = db.prepare('SELECT status FROM live_sessions WHERE id=?').get(id);
    if (s && s.status === 'starting' && !runs.has(id)) finalizeSession(id, 'never_connected');
  }, CONNECT_TIMEOUT_MS).unref();

  res.status(201).json({
    sessionId: id, model: model.id, rate: model.creditsPerSecond, reserved: reserve,
    maxSeconds: Math.floor(reserve / model.creditsPerSecond), engine: config.engine.mode,
    user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(user.id)),
  });
}));

liveRouter.post('/:id/stop', wrap((req, res) => {
  const s = db.prepare('SELECT * FROM live_sessions WHERE id=? AND user_id=?').get(req.params.id, req.user.id);
  if (!s) throw new HttpError(404, 'Live session not found.');
  const run = runs.get(s.id);
  if (run) run.end('user'); else finalizeSession(s.id, 'user');
  const done = db.prepare('SELECT * FROM live_sessions WHERE id=?').get(s.id);
  res.json({ session: sessionDto(done), user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)) });
}));

liveRouter.get('/history', (req, res) => {
  const rows = db.prepare('SELECT * FROM live_sessions WHERE user_id=? ORDER BY started_at DESC LIMIT 50').all(req.user.id);
  res.json({ sessions: rows.map(sessionDto) });
});

// ───────────────────────── WebSocket ─────────────────────────

export function attachLiveSocket(server) {
  const wss = new WebSocketServer({ noServer: true, maxPayload: 4 * 1024 * 1024 });
  server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url, 'http://local');
    if (url.pathname !== '/ws/live') return; // let other upgrade handlers (Vite HMR) run
    const user = userFromCookieHeader(req.headers.cookie);
    const session = user && db.prepare(`SELECT * FROM live_sessions WHERE id=? AND user_id=? AND status='starting'`).get(url.searchParams.get('session'), user.id);
    if (!session || runs.has(session.id)) {
      socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
      return socket.destroy();
    }
    wss.handleUpgrade(req, socket, head, client => {
      client.isAlive = true;
      client.on('pong', () => { client.isAlive = true; });
      const run = new LiveRun(session, user, client);
      runs.set(session.id, run);
      client.on('message', (data, isBinary) => run.onClientMessage(data, isBinary));
      client.on('close', () => run.end('disconnected'));
      client.on('error', () => run.end('disconnected'));
      run.start();
    });
  });
  // Keep connections honest behind proxies.
  setInterval(() => {
    for (const client of wss.clients) {
      if (client.isAlive === false) { client.terminate(); continue; }
      client.isAlive = false; client.ping();
    }
  }, 20_000).unref();
}

export const activeRuns = () => runs.size;
