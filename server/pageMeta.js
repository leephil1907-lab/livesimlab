// Per-page titles and descriptions. Shared by the server (link previews, SEO)
// and the browser (updates the tags when you navigate). Pure ESM, no imports.

export const PAGE_META = {
  '/': { title: '', description: '' }, // falls back to brand tagline + description
  '/pricing': { title: 'Pricing in naira', description: 'One-time credit packs in naira. Preview your camera free, pay only while live AI video runs, and get unused reserved credits back.' },
  '/download': { title: 'Download', description: 'Use the live AI character studio in Chrome or Edge on Windows, Mac or Linux. Pop out the output window and bring it into your calls.' },
  '/how-it-works': { title: 'How live AI video works', description: 'Pick a character, check your framing for free, then go live. Your expressions and movement drive the character in real time.' },
  '/safety': { title: 'Safety rules & report abuse', description: 'Made for creativity, not deception. What is allowed, what is prohibited and how to report misuse.' },
  '/privacy': { title: 'Privacy policy', description: 'What we collect, why, and how long we keep it.' },
  '/terms': { title: 'Terms of service', description: 'The rules for using the studio, credits and live AI video.' },
  '/cookies': { title: 'Cookie policy', description: 'Essential cookies keep you signed in. Optional cookies are off until you accept them.' },
  '/register': { title: 'Create your account', description: 'Create a free account, preview your camera and try your first character in minutes.' },
  '/login': { title: 'Sign in', description: 'Sign in to your studio.' },
};

export function metaFor(path, brand = {}) {
  const name = brand.name || 'Reachmark FaceHub';
  const clean = (String(path || '/').split(/[?#]/)[0].replace(/\/+$/, '')) || '/';
  const page = PAGE_META[clean] || {};
  const title = page.title ? `${page.title} · ${name}` : `${name} · ${brand.tagline || 'Real-time AI character studio'}`;
  const description = page.description || brand.description || '';
  return { title, description, path: clean, known: clean in PAGE_META };
}
