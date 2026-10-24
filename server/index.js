import express from 'express';
import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { config, publicConfig, ROOT } from './config.js';
import './db.js';
import { attachUser, authRouter } from './auth.js';
import { charactersRouter } from './characters.js';
import { paystackWebhook, walletRouter } from './wallet.js';
import { attachLiveSocket, engineStatus, liveRouter } from './live.js';
import { adminRouter } from './admin.js';
import { HttpError } from './util.js';

const dev = process.argv.includes('--dev');
const app = express();
const server = createServer(app);

app.disable('x-powered-by');
app.set('trust proxy', config.trustProxy);
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=()');
  next();
});

// Health checks (no auth) for Docker / Railway / uptime monitors.
app.get('/healthz', (_req, res) => res.json({ ok: true }));

// Paystack webhook needs the raw body for signature verification.
app.post('/api/paystack/webhook', express.raw({ type: '*/*', limit: '1mb' }), paystackWebhook);

// CSRF guard: state-changing API calls must be JSON (forms can't send it cross-site)
// and sign-in cookies are SameSite=Lax.
app.use('/api', (req, _res, next) => {
  const mutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
  const hasBody = Number(req.headers['content-length'] || 0) > 0 || !!req.headers['transfer-encoding'];
  if (mutating && hasBody && !req.is('application/json')) {
    return next(new HttpError(415, 'Requests must be sent as JSON.'));
  }
  next();
});
app.use('/api', express.json({ limit: '7mb' }), attachUser);

app.get('/api/config', async (_req, res) => {
  const engine = await engineStatus();
  res.json({ ...publicConfig(), engine: { mode: engine.mode, available: engine.available } });
});
app.use('/api/auth', authRouter);
app.use('/api/characters', charactersRouter);
app.use('/api/wallet', walletRouter);
app.use('/api/live', liveRouter);
app.use('/api/admin', adminRouter);
app.use('/api', (_req, _res, next) => next(new HttpError(404, 'Not found.')));

app.use((err, _req, res, _next) => {
  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error('[error]', err);
  res.status(status).json({ error: status >= 500 && !(err instanceof HttpError) ? 'Something went wrong. Please try again.' : err.message, ...(err.extra || {}) });
});

attachLiveSocket(server);

// ── Front-end: Vite middleware in dev, static build in production ──
if (dev) {
  const { createServer: createVite } = await import('vite');
  const vite = await createVite({ root: ROOT, server: { middlewareMode: true, hmr: { server } }, appType: 'spa' });
  app.use(vite.middlewares);
} else {
  const dist = resolve(ROOT, 'dist');
  const index = resolve(dist, 'index.html');
  app.use(express.static(dist, {
    index: false,
    setHeaders: (res, file) => res.setHeader('Cache-Control', file.includes('/assets/') ? 'public, max-age=31536000, immutable' : 'public, max-age=3600'),
  }));
  app.use((req, res, next) => {
    if (req.method !== 'GET' || /\.[a-z0-9]+$/i.test(req.path)) return next();
    if (!existsSync(index)) return res.status(503).send('Front-end not built yet. Run "npm run build" first.');
    res.setHeader('Cache-Control', 'no-cache');
    res.type('html').send(readFileSync(index, 'utf8'));
  });
}

server.listen(config.port, config.host, () => {
  const { payments, engine, site } = config;
  console.log(`\n  ${site.brand.name} running on http://${config.host === '0.0.0.0' ? 'localhost' : config.host}:${config.port}${dev ? '  (dev mode)' : ''}`);
  console.log(`  Payments: ${payments.mode}   ·   Live engine: ${engine.mode}${engine.workerUrl ? ` (${engine.workerUrl})` : ''}\n`);
});

for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { server.close(); process.exit(0); });
