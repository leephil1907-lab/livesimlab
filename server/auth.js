import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { Router } from 'express';
import { config } from './config.js';
import { db, tx } from './db.js';
import { HttpError, rateLimit, wrap } from './util.js';

const COOKIE = 'fh_session';
const SESSION_DAYS = 30;

export function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}
function verifyPassword(password, stored) {
  const [scheme, saltB64, hashB64] = String(stored).split('$');
  if (scheme !== 'scrypt' || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, 'base64');
  const actual = scryptSync(password, Buffer.from(saltB64, 'base64'), expected.length, { N: 16384, r: 8, p: 1 });
  return timingSafeEqual(expected, actual);
}
const tokenId = token => createHash('sha256').update(config.sessionSecret).update(token).digest('hex');

function parseCookies(header = '') {
  const out = {};
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function setSessionCookie(res, token, maxAgeSeconds) {
  const parts = [`${COOKIE}=${token}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${maxAgeSeconds}`];
  if (config.secureCookies) parts.push('Secure');
  res.append('Set-Cookie', parts.join('; '));
}

function createSession(res, userId) {
  const token = randomBytes(32).toString('base64url');
  db.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)')
    .run(tokenId(token), userId, Date.now() + SESSION_DAYS * 86400_000);
  setSessionCookie(res, token, SESSION_DAYS * 86400);
}

/** Resolve the signed-in user from a raw Cookie header (used by HTTP and WebSocket). */
export function userFromCookieHeader(cookieHeader) {
  const token = parseCookies(cookieHeader)[COOKIE];
  if (!token) return null;
  const row = db.prepare(`
    SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.id = ? AND s.expires_at > ? AND u.disabled = 0`).get(tokenId(token), Date.now());
  return row || null;
}

export function publicUser(u) {
  return {
    id: u.id, email: u.email, name: u.name,
    credits: Math.round(u.credits * 100) / 100,
    isAdmin: !!u.is_admin || config.adminEmails.includes(u.email.toLowerCase()),
    createdAt: u.created_at,
  };
}

export function attachUser(req, _res, next) {
  req.user = userFromCookieHeader(req.headers.cookie);
  next();
}
export function requireAuth(req, _res, next) {
  if (!req.user) return next(new HttpError(401, 'Please sign in to continue.'));
  next();
}
export function requireAdmin(req, _res, next) {
  if (!req.user) return next(new HttpError(401, 'Please sign in to continue.'));
  if (!publicUser(req.user).isAdmin) return next(new HttpError(403, 'Admins only.'));
  next();
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const authLimiter = rateLimit({ windowMs: 15 * 60_000, max: 20, message: 'Too many attempts. Please wait a few minutes and try again.' });

export const authRouter = Router();

authRouter.post('/register', authLimiter, wrap((req, res) => {
  const name = String(req.body?.name || '').trim().slice(0, 80);
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  if (!name) throw new HttpError(400, 'Please enter your name.');
  if (!EMAIL_RE.test(email)) throw new HttpError(400, 'Please enter a valid email address.');
  if (password.length < 8) throw new HttpError(400, 'Use a password with at least 8 characters.');
  if (!req.body?.acceptTerms) throw new HttpError(400, 'Please accept the terms to create your account.');
  if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) throw new HttpError(409, 'An account with this email already exists. Try signing in.');

  const isFirstUser = db.prepare('SELECT COUNT(*) n FROM users').get().n === 0;
  const userId = tx(() => {
    const id = db.prepare('INSERT INTO users (email, name, password_hash, is_admin, credits) VALUES (?, ?, ?, ?, ?)')
      .run(email, name, hashPassword(password), isFirstUser && config.adminEmails.length === 0 ? 1 : 0, config.signupBonusCredits).lastInsertRowid;
    if (config.signupBonusCredits > 0) {
      db.prepare(`INSERT INTO transactions (user_id, kind, status, credits, description) VALUES (?, 'bonus', 'completed', ?, 'Welcome credits')`)
        .run(id, config.signupBonusCredits);
    }
    return id;
  })();
  createSession(res, userId);
  res.status(201).json({ user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(userId)) });
}));

authRouter.post('/login', authLimiter, wrap((req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !verifyPassword(password, user.password_hash)) throw new HttpError(401, 'That email and password don’t match.');
  if (user.disabled) throw new HttpError(403, 'This account is disabled. Please contact support.');
  createSession(res, user.id);
  res.json({ user: publicUser(user) });
}));

authRouter.post('/logout', (req, res) => {
  const token = parseCookies(req.headers.cookie)[COOKIE];
  if (token) db.prepare('DELETE FROM sessions WHERE id = ?').run(tokenId(token));
  setSessionCookie(res, '', 0);
  res.json({ ok: true });
});

authRouter.get('/me', (req, res) => {
  res.json({ user: req.user ? publicUser(req.user) : null });
});

authRouter.post('/profile', requireAuth, wrap((req, res) => {
  const name = String(req.body?.name || '').trim().slice(0, 80);
  if (!name) throw new HttpError(400, 'Please enter your name.');
  db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name, req.user.id);
  res.json({ user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)) });
}));

authRouter.post('/password', requireAuth, authLimiter, wrap((req, res) => {
  const current = String(req.body?.currentPassword || '');
  const next = String(req.body?.newPassword || '');
  if (!verifyPassword(current, req.user.password_hash)) throw new HttpError(400, 'Your current password is incorrect.');
  if (next.length < 8) throw new HttpError(400, 'Use a new password with at least 8 characters.');
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(next), req.user.id);
  // Sign out other devices.
  const token = parseCookies(req.headers.cookie)[COOKIE];
  db.prepare('DELETE FROM sessions WHERE user_id = ? AND id != ?').run(req.user.id, tokenId(token));
  res.json({ ok: true });
}));
