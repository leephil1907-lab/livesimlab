import { Router } from 'express';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { config, ROOT } from './config.js';
import { db } from './db.js';
import { requireAuth } from './auth.js';
import { HttpError, newId, wrap } from './util.js';

const UPLOADS = resolve(config.dataDir, 'uploads');
const MAX_BYTES = 4 * 1024 * 1024;
const MAX_PER_USER = 24;

function sniffImage(buf) {
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: 'image/jpeg', ext: 'jpg' };
  if (buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { mime: 'image/png', ext: 'png' };
  if (buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP') return { mime: 'image/webp', ext: 'webp' };
  return null;
}

const toDto = c => ({ id: c.id, name: c.name, image: `/api/characters/${c.id}/image`, sample: false, createdAt: c.created_at });

export function listCharacters(userId) {
  const samples = config.site.sampleCharacters.map(s => ({ ...s, sample: true }));
  const mine = db.prepare('SELECT * FROM characters WHERE user_id = ? ORDER BY created_at DESC').all(userId).map(toDto);
  return [...mine, ...samples];
}

/** Return the raw image bytes for a character the user may use (their upload or a sample). */
export function loadCharacterImage(userId, characterId) {
  const sample = config.site.sampleCharacters.find(s => s.id === characterId);
  if (sample) {
    const file = resolve(ROOT, 'public', '.' + sample.image);
    if (!existsSync(file)) throw new HttpError(404, 'Sample character image is missing.');
    return { bytes: readFileSync(file), mime: 'image/webp', name: sample.name };
  }
  const row = db.prepare('SELECT * FROM characters WHERE id = ? AND user_id = ?').get(characterId, userId);
  if (!row) throw new HttpError(404, 'Character not found.');
  return { bytes: readFileSync(resolve(UPLOADS, row.file)), mime: row.mime, name: row.name };
}

export const charactersRouter = Router();
charactersRouter.use(requireAuth);

charactersRouter.get('/', (req, res) => res.json({ characters: listCharacters(req.user.id) }));

charactersRouter.post('/', wrap((req, res) => {
  const name = String(req.body?.name || '').trim().slice(0, 40) || 'My character';
  if (req.body?.consent !== true) {
    throw new HttpError(400, 'Please confirm you have permission to use this portrait.');
  }
  const match = /^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/s.exec(String(req.body?.image || ''));
  if (!match) throw new HttpError(400, 'Please upload a JPG, PNG or WebP image.');
  const bytes = Buffer.from(match[2], 'base64');
  if (bytes.length > MAX_BYTES) throw new HttpError(413, 'That image is too large. Please use one under 4 MB.');
  const kind = sniffImage(bytes);
  if (!kind) throw new HttpError(400, 'That file doesn’t look like a valid image.');
  const count = db.prepare('SELECT COUNT(*) n FROM characters WHERE user_id = ?').get(req.user.id).n;
  if (count >= MAX_PER_USER) throw new HttpError(400, `You can keep up to ${MAX_PER_USER} characters. Delete one to add another.`);

  const id = newId('chr', 9);
  const file = `${req.user.id}-${id}.${kind.ext}`;
  writeFileSync(resolve(UPLOADS, file), bytes);
  db.prepare(`INSERT INTO characters (id, user_id, name, file, mime, consent_at) VALUES (?, ?, ?, ?, ?, datetime('now'))`)
    .run(id, req.user.id, name, file, kind.mime);
  res.status(201).json({ character: toDto(db.prepare('SELECT * FROM characters WHERE id = ?').get(id)) });
}));

charactersRouter.get('/:id/image', wrap((req, res) => {
  const row = db.prepare('SELECT * FROM characters WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!row) throw new HttpError(404, 'Character not found.');
  res.setHeader('Content-Type', row.mime);
  res.setHeader('Cache-Control', 'private, max-age=86400');
  res.end(readFileSync(resolve(UPLOADS, row.file)));
}));

charactersRouter.delete('/:id', wrap((req, res) => {
  const row = db.prepare('SELECT * FROM characters WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!row) throw new HttpError(404, 'Character not found.');
  db.prepare('DELETE FROM characters WHERE id = ?').run(row.id);
  try { unlinkSync(resolve(UPLOADS, row.file)); } catch { /* already gone */ }
  res.json({ ok: true });
}));
