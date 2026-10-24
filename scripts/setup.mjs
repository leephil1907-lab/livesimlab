// One-time setup: creates .env from .env.example with a fresh session secret
// and local-friendly defaults (demo payments + test engine) so `npm run dev` just works.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

if (existsSync('.env')) {
  console.log('✔ .env already exists — leaving it unchanged.');
} else {
  let env = readFileSync('.env.example', 'utf8');
  env = env.replace(/^SESSION_SECRET=.*$/m, `SESSION_SECRET=${randomBytes(48).toString('base64url')}`);
  env = env.replace(/^DEMO_PAYMENTS=.*$/m, 'DEMO_PAYMENTS=true');
  env = env.replace(/^TEST_ENGINE=.*$/m, 'TEST_ENGINE=true');
  writeFileSync('.env', env);
  console.log('✔ Created .env with local defaults (demo payments + test engine).');
}
console.log(`
Next steps:
  npm run dev        → http://localhost:8080  (first account you create becomes admin)

Going live:
  1. Set PAYSTACK_SECRET_KEY and turn DEMO_PAYMENTS off.
  2. Start the GPU worker (see worker/README.md), set GPU_WORKER_URL + GPU_WORKER_TOKEN, turn TEST_ENGINE off.
  3. npm run build && npm start   (or: docker compose up -d)
`);
