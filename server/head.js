// Builds the <head> metadata (title, description, icons, Open Graph, Twitter)
// from config/site.json + .env, so renaming the brand updates link previews too.
import { config } from './config.js';
import { metaFor } from './pageMeta.js';

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const START = '<!--head:start-->';
const END = '<!--head:end-->';

export const THEME = { paper: '#f5f5f2', ink: '#11150a', lime: '#c6f432', studio: '#141517' };

export function headTags(path = '/', origin = '') {
  const brand = config.site.brand;
  const short = brand.shortName || brand.name;
  const { title, description, path: clean } = metaFor(path, brand);
  const base = config.publicUrl || origin || '';
  const url = base ? `${base}${clean === '/' ? '/' : clean}` : '';
  const image = `${base}/og-image.png`;
  return [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    `<meta name="application-name" content="${esc(short)}" />`,
    `<meta name="apple-mobile-web-app-title" content="${esc(short)}" />`,
    `<meta name="mobile-web-app-capable" content="yes" />`,
    `<meta name="apple-mobile-web-app-status-bar-style" content="default" />`,
    `<meta name="theme-color" content="${THEME.paper}" />`,
    `<meta name="color-scheme" content="light" />`,
    `<link rel="icon" href="/favicon.ico" sizes="32x32" />`,
    `<link rel="icon" href="/favicon.svg" type="image/svg+xml" />`,
    `<link rel="apple-touch-icon" href="/apple-touch-icon.png" />`,
    `<link rel="manifest" href="/manifest.webmanifest" />`,
    url && `<link rel="canonical" href="${esc(url)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${esc(brand.name)}" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    url && `<meta property="og:url" content="${esc(url)}" />`,
    `<meta property="og:image" content="${esc(image)}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="${esc(`${brand.name}: ${brand.tagline || ''}`)}" />`,
    `<meta property="og:locale" content="en_NG" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(title)}" />`,
    `<meta name="twitter:description" content="${esc(description)}" />`,
    `<meta name="twitter:image" content="${esc(image)}" />`,
  ].filter(Boolean).join('\n    ');
}

/** Best-effort public origin of a request (used when PUBLIC_URL isn't set). */
export function originOf(req) {
  const host = req.headers?.['x-forwarded-host'] || req.headers?.host;
  if (!host) return '';
  const proto = String(req.headers?.['x-forwarded-proto'] || (req.socket?.encrypted ? 'https' : 'http')).split(',')[0].trim();
  return `${proto}://${String(host).split(',')[0].trim()}`;
}

/** Replace the marked block in index.html with metadata for this path. */
export function injectHead(html, path, origin) {
  const a = html.indexOf(START), b = html.indexOf(END);
  if (a === -1 || b === -1) return html;
  return `${html.slice(0, a + START.length)}\n    ${headTags(path, origin)}\n    ${html.slice(b)}`;
}

export function manifest() {
  const brand = config.site.brand;
  return {
    name: brand.name,
    short_name: brand.shortName || brand.name,
    description: brand.description,
    id: '/',
    start_url: '/studio',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: THEME.studio,
    theme_color: THEME.studio,
    categories: ['entertainment', 'photo', 'video'],
    icons: [
      { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Open studio', url: '/studio' },
      { name: 'Buy credits', url: '/billing' },
    ],
  };
}
