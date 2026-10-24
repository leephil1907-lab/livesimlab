// Central configuration. Everything an operator needs to change lives in
// `.env` (secrets, URLs, switches) or `config/site.json` (brand, prices,
// models, sample characters). Nothing else needs editing.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Minimal .env loader (no dependency). Real environment variables win.
function loadEnvFile(file) {
  if (!existsSync(file)) return;
  for (const raw of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i < 1) continue;
    const key = line.slice(0, i).trim();
    let value = line.slice(i + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (process.env[key] === undefined) process.env[key] = value;
  }
}
loadEnvFile(resolve(ROOT, '.env'));

const env = (key, fallback = '') => (process.env[key] ?? fallback).toString().trim();
const bool = (key, fallback = false) => {
  const v = env(key, '');
  if (!v) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(v.toLowerCase());
};
const num = (key, fallback) => {
  const v = Number(env(key, ''));
  return Number.isFinite(v) && env(key, '') !== '' ? v : fallback;
};

const DATA_DIR = resolve(ROOT, env('DATA_DIR', 'data'));
mkdirSync(resolve(DATA_DIR, 'uploads'), { recursive: true });

// Session secret: use the configured one, otherwise create one once and keep it
// in the data directory so sign-ins survive restarts without manual setup.
function sessionSecret() {
  const configured = env('SESSION_SECRET');
  if (configured && configured.length >= 32 && !configured.startsWith('replace-')) return configured;
  const file = resolve(DATA_DIR, '.session-secret');
  if (existsSync(file)) return readFileSync(file, 'utf8').trim();
  const secret = randomBytes(48).toString('base64url');
  writeFileSync(file, secret, { mode: 0o600 });
  return secret;
}

const site = JSON.parse(readFileSync(resolve(ROOT, 'config/site.json'), 'utf8'));
if (env('APP_NAME')) site.brand.name = env('APP_NAME');

const isProd = env('NODE_ENV') === 'production';
const paystackSecret = env('PAYSTACK_SECRET_KEY');
const workerUrl = env('GPU_WORKER_URL').replace(/\/+$/, '');

export const config = {
  isProd,
  port: num('PORT', 8080),
  host: env('HOST', '0.0.0.0'),
  publicUrl: env('PUBLIC_URL').replace(/\/+$/, ''),
  dataDir: DATA_DIR,
  sessionSecret: sessionSecret(),
  secureCookies: bool('SECURE_COOKIES', isProd),
  trustProxy: bool('TRUST_PROXY', true),
  adminEmails: env('ADMIN_EMAILS').split(',').map(s => s.trim().toLowerCase()).filter(Boolean),
  signupBonusCredits: Math.max(0, Math.floor(num('SIGNUP_BONUS_CREDITS', 0))),

  // Payments: "paystack" when a secret key is present, "demo" only when explicitly
  // enabled (instant credits, for local testing), otherwise "disabled".
  payments: {
    mode: paystackSecret ? 'paystack' : bool('DEMO_PAYMENTS', false) ? 'demo' : 'disabled',
    paystackSecret,
    paystackBase: env('PAYSTACK_BASE_URL', 'https://api.paystack.co'),
  },

  // Live engine: real GPU worker when configured; a clearly-labelled pass-through
  // "test engine" when TEST_ENGINE=true (to exercise the full flow without a GPU).
  engine: {
    mode: workerUrl ? 'worker' : bool('TEST_ENGINE', false) ? 'test' : 'none',
    workerUrl,
    workerToken: env('GPU_WORKER_TOKEN'),
  },

  links: {
    windowsApp: env('WINDOWS_APP_URL'),
    whatsapp: env('SUPPORT_WHATSAPP').replace(/[^\d]/g, ''),
    email: env('SUPPORT_EMAIL'),
    telegram: env('SUPPORT_TELEGRAM'),
  },
  site,
};

export function publicConfig() {
  const { site: s, payments, engine, links } = config;
  return {
    brand: s.brand,
    currency: s.currency,
    pricePerCreditKobo: s.pricePerCreditKobo,
    customCredits: s.customCredits,
    packages: s.packages,
    models: s.models.map(({ id, name, creditsPerSecond, description, profile }) => ({ id, name, creditsPerSecond, description, profile })),
    paymentsMode: payments.mode,
    engineMode: engine.mode,
    links,
  };
}
