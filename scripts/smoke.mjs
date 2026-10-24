// End-to-end smoke test. Boots the server against a throw-away database with
// demo payments + the test engine, then walks the real user journey:
// register → buy credits → upload character → go live over WebSocket →
// per-second billing → stop → refund of unused credits. Run: npm run smoke
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import WebSocket from 'ws';

const port = 18000 + Math.floor(Math.random() * 1000);
const base = `http://127.0.0.1:${port}`;
const dataDir = mkdtempSync(join(tmpdir(), 'facehub-smoke-'));
const server = spawn(process.execPath, ['server/index.js'], {
  env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', DATA_DIR: dataDir, DEMO_PAYMENTS: 'true', TEST_ENGINE: 'true', GPU_WORKER_URL: '', PAYSTACK_SECRET_KEY: '', SIGNUP_BONUS_CREDITS: '0' },
  stdio: ['ignore', 'pipe', 'inherit'],
});

let cookie = '';
async function call(path, { method = 'GET', body } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const set = res.headers.get('set-cookie');
  if (set) cookie = set.split(';')[0];
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}
const assert = (cond, msg) => { if (!cond) throw new Error('✗ ' + msg); console.log('✓ ' + msg); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

// 1×1 JPEG
const JPEG = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64');

try {
  for (let i = 0; i < 50; i++) { try { if ((await fetch(base + '/healthz')).ok) break; } catch { /* booting */ } await sleep(200); }
  assert((await call('/healthz')).data.ok, 'server healthy');

  const cfg = (await call('/api/config')).data;
  assert(cfg.packages.length > 0 && cfg.engine.available, 'public config + test engine available');

  const home = await fetch(base + '/pricing');
  assert(home.status === 200 && (await home.text()).includes('<div id="root">'), 'SPA served for deep links');

  let r = await call('/api/auth/register', { method: 'POST', body: { name: 'Smoke', email: 'smoke@example.com', password: 'password123', acceptTerms: true } });
  assert(r.status === 201 && r.data.user.isAdmin, 'register (first user is admin)');
  assert((await call('/api/auth/register', { method: 'POST', body: { name: 'x', email: 'smoke@example.com', password: 'password123', acceptTerms: true } })).status === 409, 'duplicate email rejected');

  r = await call('/api/live/start', { method: 'POST', body: { characterId: 'sample-amara', model: 'signature' } });
  assert(r.status === 402, 'cannot go live without credits');

  r = await call('/api/wallet/checkout', { method: 'POST', body: { packageId: 'test' } });
  assert(r.status === 200 && r.data.url.includes('/billing/callback'), 'checkout (demo)');
  r = await call(`/api/wallet/verify?reference=${r.data.reference}`);
  assert(r.data.transaction.status === 'completed' && r.data.user.credits === 200, 'purchase credited: 200 credits');

  r = await call('/api/characters', { method: 'POST', body: { name: 'Mine', image: 'data:image/jpeg;base64,' + JPEG.toString('base64'), consent: false } });
  assert(r.status === 400, 'upload without consent rejected');
  r = await call('/api/characters', { method: 'POST', body: { name: 'Mine', image: 'data:image/jpeg;base64,' + JPEG.toString('base64'), consent: true } });
  assert(r.status === 201, 'character uploaded with consent');
  const charId = r.data.character.id;

  r = await call('/api/live/start', { method: 'POST', body: { characterId: charId, model: 'signature', creditLimit: 30 } });
  assert(r.status === 201 && r.data.reserved === 30 && r.data.user.credits === 170, 'go live reserves 30 credits');
  const sessionId = r.data.sessionId;

  const ws = new WebSocket(`ws://127.0.0.1:${port}/ws/live?session=${sessionId}`, { headers: { Cookie: cookie } });
  let echoed = 0, ready = false, lastTick = null, ended = null;
  ws.on('message', (data, isBinary) => {
    if (isBinary) { echoed++; return; }
    const msg = JSON.parse(data.toString());
    if (msg.type === 'ready') ready = true;
    if (msg.type === 'tick') lastTick = msg;
    if (msg.type === 'ended') ended = msg;
  });
  await new Promise((res, rej) => { ws.once('open', res); ws.once('error', rej); });
  for (let i = 0; i < 30 && !ready; i++) await sleep(100);
  assert(ready, 'engine ready over WebSocket');
  const pump = setInterval(() => ws.readyState === 1 && ws.send(JPEG), 50);
  await sleep(3300);
  assert(echoed > 20, `frames relayed (${echoed})`);
  assert(lastTick && lastTick.seconds >= 2, `metered per second (${lastTick?.seconds}s)`);
  ws.send(JSON.stringify({ type: 'stop' }));
  for (let i = 0; i < 30 && !ended; i++) await sleep(100);
  clearInterval(pump);
  assert(ended && ended.reason === 'user', 'stopped by user');
  const used = ended.session.charged;
  assert(used >= 2 && used <= 5 && ended.user.credits === 200 - used, `charged ${used}, refunded ${30 - used} → balance ${ended.user.credits}`);

  r = await call('/api/wallet');
  assert(r.data.transactions.some(t => t.kind === 'usage' && t.status === 'completed' && t.credits === -used), 'usage recorded in history');

  r = await call('/api/admin/overview');
  assert(r.status === 200 && r.data.users === 1, 'admin overview');

  console.log('\nAll smoke checks passed.');
} catch (err) {
  console.error(err.message || err);
  process.exitCode = 1;
} finally {
  server.kill();
  rmSync(dataDir, { recursive: true, force: true });
}
