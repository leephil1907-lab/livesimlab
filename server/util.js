import { randomBytes } from 'node:crypto';

export class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

/** Wrap sync/async handlers so thrown errors reach the error middleware. */
export const wrap = fn => (req, res, next) => {
  try {
    const out = fn(req, res, next);
    if (out && typeof out.catch === 'function') out.catch(next);
  } catch (err) {
    next(err);
  }
};

export const newId = (prefix, bytes = 12) => `${prefix}_${randomBytes(bytes).toString('base64url')}`;

/** Small in-memory fixed-window rate limiter keyed by client IP. */
export function rateLimit({ windowMs, max, message }) {
  const hits = new Map();
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
  }, windowMs).unref();
  return (req, _res, next) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    let entry = hits.get(key);
    if (!entry || entry.reset < now) {
      entry = { count: 0, reset: now + windowMs };
      hits.set(key, entry);
    }
    entry.count += 1;
    if (entry.count > max) return next(new HttpError(429, message || 'Too many requests.'));
    next();
  };
}

export const formatNaira = kobo =>
  '₦' + (kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
