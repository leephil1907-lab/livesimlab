// In-browser face tracking for the studio (MediaPipe Face Landmarker, runs locally —
// no frames leave the device). Powers the tracking overlay and the framing coach.
// The runtime (≈10 MB wasm + 3.7 MB model) is loaded lazily, only when the studio
// actually turns tracking on.

let landmarkerPromise = null;
let ovalPairs = null;

async function loadLandmarker() {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
      ovalPairs = FaceLandmarker.FACE_LANDMARKS_FACE_OVAL;
      const fileset = await FilesetResolver.forVisionTasks('/vendor/mediapipe');
      const options = delegate => ({
        baseOptions: { modelAssetPath: '/models/face_landmarker.task', delegate },
        runningMode: 'VIDEO', numFaces: 1,
        minFaceDetectionConfidence: 0.5, minFacePresenceConfidence: 0.5, minTrackingConfidence: 0.5,
      });
      try { return await FaceLandmarker.createFromOptions(fileset, options('GPU')); } catch { return FaceLandmarker.createFromOptions(fileset, options('CPU')); }
    })().catch(err => { landmarkerPromise = null; throw err; });
  }
  return landmarkerPromise;
}

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const DEG = 180 / Math.PI;

/** Turn raw measurements into one clear instruction. */
export function coach(m) {
  if (!m || !m.face) return { level: 'warn', title: 'Looking for your face', tip: 'Face the camera and keep your whole face in view.', score: 0 };
  const issues = [];
  if (m.light < 0.2) issues.push({ w: 3, title: 'Too dark', tip: 'Turn toward a window or lamp so your face is evenly lit.' });
  else if (m.light > 0.88) issues.push({ w: 2, title: 'Too bright', tip: 'Your face is over-exposed. Move away from strong light or lower it a little.' });
  if (m.size < 0.16) issues.push({ w: 3, title: 'Move a little closer', tip: 'Your face should fill about a third of the frame.' });
  else if (m.size > 0.62) issues.push({ w: 2, title: 'Move back a little', tip: 'Leave some space around your head and shoulders.' });
  if (Math.abs(m.offX) > 0.2 || Math.abs(m.offY) > 0.22) issues.push({ w: 2, title: 'Center your face', tip: 'Line your face up with the middle of the frame.' });
  if (Math.abs(m.yaw) > 30 || Math.abs(m.pitch) > 28 || Math.abs(m.roll) > 22) issues.push({ w: 1, title: 'Face the camera', tip: 'Small head turns are fine — big angles make the character less stable.' });
  const score = Math.round(clamp(100 - issues.reduce((s, i) => s + i.w * 14, 0), 20, 100));
  if (!issues.length) return { level: 'ok', title: 'Face locked', tip: 'Great framing — you’re ready to go live.', score };
  const top = issues.sort((a, b) => b.w - a.w)[0];
  return { level: top.w >= 3 ? 'warn' : 'info', title: top.title, tip: top.tip, score };
}

export class FaceTracker {
  /**
   * @param {HTMLVideoElement} video
   * @param {{ onMetrics?: (m) => void, onLandmarks?: (points, m) => void, fps?: number }} opts
   */
  constructor(video, { onMetrics, onLandmarks, fps = 15 } = {}) {
    this.video = video; this.onMetrics = onMetrics; this.onLandmarks = onLandmarks;
    this.interval = 1000 / fps; this.last = 0; this.misses = 0; this.running = false;
    this.light = 0.5; this.lightAt = 0; this.lastTs = 0;
    this.sampler = document.createElement('canvas');
    this.sampler.width = 48; this.sampler.height = 27;
  }

  async start() {
    this.running = true;
    this.landmarker = await loadLandmarker();
    if (!this.running) return;
    const step = now => {
      if (!this.running) return;
      this.raf = requestAnimationFrame(step);
      if (now - this.last < this.interval) return;
      this.last = now;
      this.detect();
    };
    this.raf = requestAnimationFrame(step);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  detect() {
    const v = this.video;
    if (!v || v.readyState < 2 || !v.videoWidth) return;
    const ts = Math.max(performance.now(), this.lastTs + 1); // timestamps must increase
    this.lastTs = ts;
    let res;
    try { res = this.landmarker.detectForVideo(v, ts); } catch { return; }
    const pts = res?.faceLandmarks?.[0];
    if (!pts) {
      this.misses += 1;
      this.onLandmarks?.(null, null);
      if (this.misses > 4) this.onMetrics?.({ face: false });
      return;
    }
    this.misses = 0;
    const aspect = v.videoWidth / v.videoHeight;
    let x0 = 1, y0 = 1, x1 = 0, y1 = 0;
    for (const p of pts) { if (p.x < x0) x0 = p.x; if (p.x > x1) x1 = p.x; if (p.y < y0) y0 = p.y; if (p.y > y1) y1 = p.y; }
    const nose = pts[1], left = pts[234], right = pts[454], eyeL = pts[33], eyeR = pts[263], chin = pts[152], brow = pts[10];
    const midX = (left.x + right.x) / 2, half = Math.max(1e-3, (right.x - left.x) / 2);
    const yaw = Math.asin(clamp((nose.x - midX) / half, -1, 1)) * DEG;
    const roll = Math.atan2((eyeR.y - eyeL.y), (eyeR.x - eyeL.x) * aspect) * DEG;
    const faceH = Math.max(1e-3, chin.y - brow.y);
    const pitch = ((nose.y - brow.y) / faceH - 0.55) * 120;
    const now = performance.now();
    if (now - this.lightAt > 400) { this.lightAt = now; this.light = this.measureLight(x0, y0, x1, y1); }
    const m = {
      face: true, size: x1 - x0, offX: (x0 + x1) / 2 - 0.5, offY: (y0 + y1) / 2 - 0.47,
      yaw, roll, pitch, light: this.light, box: [x0, y0, x1, y1],
    };
    this.onLandmarks?.(pts, m);
    this.onMetrics?.(m);
  }

  /** Average luminance (0–1) inside the face box. */
  measureLight(x0, y0, x1, y1) {
    try {
      const c = this.sampler, ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(this.video, 0, 0, c.width, c.height);
      const sx = Math.floor(clamp(x0, 0, 1) * c.width), sy = Math.floor(clamp(y0, 0, 1) * c.height);
      const sw = Math.max(1, Math.ceil((clamp(x1, 0, 1) - clamp(x0, 0, 1)) * c.width)), sh = Math.max(1, Math.ceil((clamp(y1, 0, 1) - clamp(y0, 0, 1)) * c.height));
      const d = ctx.getImageData(sx, sy, sw, sh).data;
      let sum = 0;
      for (let i = 0; i < d.length; i += 4) sum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
      return sum / (d.length / 4) / 255;
    } catch { return this.light; }
  }
}

/** Draw tracking dots + face outline onto an overlay canvas that covers an object-fit:contain video. */
export function drawTracking(canvas, video, pts, level) {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = Math.round(rect.width * dpr), H = Math.round(rect.height * dpr);
  if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, W, H);
  if (!pts || !video?.videoWidth) return;
  // object-fit: contain mapping
  const vr = video.videoWidth / video.videoHeight, cr = W / H;
  const dw = vr > cr ? W : H * vr, dh = vr > cr ? W / vr : H;
  const ox = (W - dw) / 2, oy = (H - dh) / 2;
  const X = p => ox + p.x * dw, Y = p => oy + p.y * dh;
  const color = level === 'ok' ? '120, 230, 170' : level === 'warn' ? '255, 196, 90' : '150, 180, 255';

  if (ovalPairs) {
    ctx.strokeStyle = `rgba(${color}, .75)`;
    ctx.lineWidth = 1.5 * dpr;
    ctx.shadowColor = `rgba(${color}, .8)`; ctx.shadowBlur = 8 * dpr;
    ctx.beginPath();
    for (const { start, end } of ovalPairs) { ctx.moveTo(X(pts[start]), Y(pts[start])); ctx.lineTo(X(pts[end]), Y(pts[end])); }
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
  ctx.fillStyle = `rgba(${color}, .55)`;
  const r = 1.1 * dpr;
  for (let i = 0; i < 468; i += 3) { const p = pts[i]; ctx.fillRect(X(p) - r, Y(p) - r, r * 2, r * 2); }
  // key points: eyes, nose, mouth corners
  ctx.fillStyle = `rgba(${color}, 1)`;
  for (const i of [33, 263, 1, 61, 291]) { const p = pts[i]; ctx.beginPath(); ctx.arc(X(p), Y(p), 2.6 * dpr, 0, Math.PI * 2); ctx.fill(); }
}
