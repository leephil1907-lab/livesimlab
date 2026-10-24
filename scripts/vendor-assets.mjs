// Copies browser runtime files that can't be bundled by Vite (MediaPipe wasm) into
// public/vendor so they're served from your own domain. Runs on install and before
// dev/build. Safe to run repeatedly; never fails the install.
import { copyFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'node_modules/@mediapipe/tasks-vision/wasm');
const dest = join(root, 'public/vendor/mediapipe');
const files = ['vision_wasm_internal.js', 'vision_wasm_internal.wasm', 'vision_wasm_nosimd_internal.js', 'vision_wasm_nosimd_internal.wasm'];

try {
  if (!existsSync(src)) {
    console.log('[vendor] @mediapipe/tasks-vision not installed — face tracking overlay will be disabled.');
  } else {
    mkdirSync(dest, { recursive: true });
    let copied = 0;
    for (const f of files) {
      const from = join(src, f), to = join(dest, f);
      if (!existsSync(from)) continue;
      if (existsSync(to) && statSync(to).size === statSync(from).size) continue;
      copyFileSync(from, to); copied += 1;
    }
    if (copied) console.log(`[vendor] copied ${copied} MediaPipe runtime file(s) to public/vendor/mediapipe`);
  }
  if (!existsSync(join(root, 'public/models/face_landmarker.task'))) {
    console.log('[vendor] public/models/face_landmarker.task is missing — download it from\n  https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task');
  }
} catch (err) {
  console.warn('[vendor] skipped:', err.message);
}
