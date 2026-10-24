// WebGL scenes for the marketing site. Loaded lazily (dynamic import) so
// Three.js never blocks first paint, and every scene pauses when off-screen.
import * as THREE from 'three';
import { FACE_FRAG, FACE_VERT, GRADIENT_FRAG, QUAD_VERT } from './shaders.js';

const GRID = 150; // 22,500 particles per face
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Turn a portrait into particle positions/colours (with a soft face mask and depth from luminance). */
function sampleFace(img) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = GRID;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const s = Math.min(img.width, img.height);
  ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, GRID, GRID);
  const { data } = ctx.getImageData(0, 0, GRID, GRID);
  const pos = new Float32Array(GRID * GRID * 3);
  const col = new Float32Array(GRID * GRID * 4);
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const i = y * GRID + x;
      const u = x / (GRID - 1), v = y / (GRID - 1);
      const r = data[i * 4] / 255, g = data[i * 4 + 1] / 255, b = data[i * 4 + 2] / 255;
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      // Head-and-shoulders mask: an ellipse for the head plus a wider, fainter band for shoulders.
      const dx = (u - 0.5) / 0.3, dy = (v - 0.4) / 0.4;
      const head = 1 - smooth(0.78, 1.06, Math.hypot(dx, dy));
      const sx = (u - 0.5) / 0.48, sy = (v - 0.98) / 0.26;
      const shoulders = (1 - smooth(0.7, 1.05, Math.hypot(sx, sy))) * 0.55;
      const m = Math.min(1, Math.max(head, shoulders));
      const dome = Math.max(0, 1 - Math.hypot(dx, dy) ** 2);
      pos[i * 3] = (u - 0.5) * 2;
      pos[i * 3 + 1] = (0.5 - v) * 2;
      pos[i * 3 + 2] = m * (dome * 0.32 + (lum - 0.45) * 0.22) - (1 - m) * 0.6;
      col[i * 4] = r; col[i * 4 + 1] = g; col[i * 4 + 2] = b;
      col[i * 4 + 3] = m * (0.55 + lum * 0.45);
    }
  }
  return { pos, col };
}
function smooth(a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }

function gradientMaterial() {
  return new THREE.ShaderMaterial({
    vertexShader: QUAD_VERT,
    fragmentShader: GRADIENT_FRAG,
    depthWrite: false,
    depthTest: false,
    uniforms: {
      uTime: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) }, uMouse: { value: new THREE.Vector2(0.7, 0.45) },
      uFade: { value: 0 }, uIntensity: { value: 1 },
    },
  });
}

/** Base class: renderer, resize, visibility-aware render loop, pointer tracking. */
class Scene {
  constructor(container) {
    this.container = container;
    this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.renderer.setClearColor(0x050608, 1);
    this.renderer.domElement.className = 'webgl-canvas';
    container.appendChild(this.renderer.domElement);
    this.last = performance.now();
    this.delta = () => { const now = performance.now(); const d = (now - this.last) / 1000; this.last = now; return d; };
    this.visible = true;
    this.running = false;
    this.reduced = reducedMotion();
    this.mouse = new THREE.Vector2(0.7, 0.45);
    this.mouseTarget = this.mouse.clone();

    this.onResize = () => this.resize();
    this.onPointer = e => {
      const r = container.getBoundingClientRect();
      this.mouseTarget.set((e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height);
    };
    this.onVisibility = () => this.updateLoop();
    window.addEventListener('resize', this.onResize);
    window.addEventListener('pointermove', this.onPointer, { passive: true });
    document.addEventListener('visibilitychange', this.onVisibility);
    this.io = new IntersectionObserver(([entry]) => { this.visible = entry.isIntersecting; this.updateLoop(); }, { rootMargin: '100px' });
    this.io.observe(container);
  }
  updateLoop() {
    const shouldRun = this.visible && !document.hidden && !this.reduced;
    if (shouldRun && !this.running) { this.running = true; this.delta(); this.raf = requestAnimationFrame(t => this.loop(t)); }
    if (!shouldRun) { this.running = false; cancelAnimationFrame(this.raf); }
  }
  loop() {
    if (!this.running) return;
    this.frame(Math.min(this.delta(), 0.05));
    this.raf = requestAnimationFrame(t => this.loop(t));
  }
  size() { return { w: Math.max(1, this.container.clientWidth), h: Math.max(1, this.container.clientHeight) }; }
  dispose() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('pointermove', this.onPointer);
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.io.disconnect();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}

/** Full-bleed interactive shader gradient (CTA, auth page). */
export class GradientScene extends Scene {
  constructor(container, { intensity = 1 } = {}) {
    super(container);
    this.scene = new THREE.Scene();
    this.camera = new THREE.Camera();
    this.material = gradientMaterial();
    this.material.uniforms.uIntensity.value = intensity;
    this.scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material));
    this.resize();
    this.frame(0);
    this.updateLoop();
  }
  resize() {
    const { w, h } = this.size();
    this.renderer.setSize(w, h, false);
    this.material.uniforms.uRes.value.set(w, h);
    if (this.reduced) this.frame(0);
  }
  frame(dt) {
    this.mouse.lerp(this.mouseTarget, 1 - Math.pow(0.001, dt));
    const u = this.material.uniforms;
    u.uTime.value += dt;
    u.uMouse.value.copy(this.mouse);
    this.renderer.render(this.scene, this.camera);
  }
  dispose() { this.material.dispose(); super.dispose(); }
}

/** Hero: aurora background + holographic particle face morphing between characters. */
export class HoloFaceScene extends Scene {
  constructor(container, { images, interval = 4.6, onChange, onReady }) {
    super(container);
    this.onChange = onChange;
    this.interval = interval;
    this.current = 0;
    this.target = 0;
    this.progress = 1;
    this.timer = 0;
    this.scroll = 0;
    this.pointerWorld = new THREE.Vector2(9, 9);

    // background
    this.bgScene = new THREE.Scene();
    this.bgCamera = new THREE.Camera();
    this.bgMaterial = gradientMaterial();
    this.bgScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.bgMaterial));

    // particles
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
    this.camera.position.set(0, 0, 4);
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.renderer.autoClear = false;

    this.resize();
    this.renderBg();
    Promise.all(images.map(loadImage)).then(imgs => {
      if (this.disposed) return;
      this.build(imgs.map(sampleFace));
      onReady?.();
      if (this.reduced) this.render();
      this.updateLoop();
    }).catch(() => onReady?.(new Error('Could not load portraits')));
  }

  build(faces) {
    const n = GRID * GRID;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(faces[0].pos.slice(), 3));
    faces.forEach((f, i) => {
      geo.setAttribute(`aPos${i}`, new THREE.BufferAttribute(f.pos, 3));
      geo.setAttribute(`aCol${i}`, new THREE.BufferAttribute(f.col, 4));
    });
    for (let i = faces.length; i < 3; i++) { // tolerate fewer than 3 portraits
      geo.setAttribute(`aPos${i}`, new THREE.BufferAttribute(faces[0].pos, 3));
      geo.setAttribute(`aCol${i}`, new THREE.BufferAttribute(faces[0].col, 4));
    }
    const rand = new Float32Array(n * 3);
    const uv = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) {
      rand[i * 3] = Math.random(); rand[i * 3 + 1] = Math.random(); rand[i * 3 + 2] = Math.random();
      uv[i * 2] = (i % GRID) / (GRID - 1);
      uv[i * 2 + 1] = 1 - Math.floor(i / GRID) / (GRID - 1);
    }
    geo.setAttribute('aRand', new THREE.BufferAttribute(rand, 3));
    geo.setAttribute('aUv', new THREE.BufferAttribute(uv, 2));
    this.count = Math.min(3, faces.length);
    this.material = new THREE.ShaderMaterial({
      vertexShader: FACE_VERT,
      fragmentShader: FACE_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      premultipliedAlpha: true,
      uniforms: {
        uFrom: { value: new THREE.Vector3(1, 0, 0) }, uTo: { value: new THREE.Vector3(1, 0, 0) },
        uProgress: { value: 1 }, uTime: { value: 0 }, uScroll: { value: 0 },
        uSize: { value: 26 }, uPixel: { value: this.renderer.getPixelRatio() },
        uPointer: { value: new THREE.Vector2(9, 9) }, uAccent: { value: new THREE.Color('#6f93ff') }, uAlpha: { value: 0.62 },
      },
    });
    this.points = new THREE.Points(geo, this.material);
    this.points.frustumCulled = false;
    this.group.add(this.points);
    this.layout();
  }

  /** Desktop: face sits in the right half. Mobile: top-centre. */
  layout() {
    const { w, h } = this.size();
    const visH = 2 * this.camera.position.z * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const visW = visH * (w / h);
    const wide = w / h > 1.05;
    const scale = wide ? Math.min(visH * 0.4, visW * 0.24) : Math.min(visW * 0.36, visH * 0.19);
    this.group.scale.setScalar(scale);
    this.group.position.set(wide ? visW * 0.2 : 0, wide ? -visH * 0.02 : visH * 0.255, 0);
    this.visH = visH;
    if (this.material) this.material.uniforms.uSize.value = 30 * (h / 900) * (wide ? 1 : 0.9);
  }

  resize() {
    const { w, h } = this.size();
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.bgMaterial.uniforms.uRes.value.set(w, h);
    this.layout();
    if (this.reduced) this.render();
  }

  /** 0 → 1 as the hero scrolls out of view. */
  setScroll(v) {
    this.scroll = v;
    if (this.reduced) this.render();
  }

  setCharacter(i) {
    if (!this.material || i === this.target) return;
    this.current = this.progress < 1 ? this.target : this.current;
    this.target = i;
    this.progress = this.reduced ? 1 : 0;
    this.timer = 0;
    const oneHot = k => new THREE.Vector3(k === 0 ? 1 : 0, k === 1 ? 1 : 0, k === 2 ? 1 : 0);
    this.material.uniforms.uFrom.value.copy(oneHot(this.reduced ? i : this.current));
    this.material.uniforms.uTo.value.copy(oneHot(i));
    this.onChange?.(i);
    if (this.reduced) this.render();
  }

  frame(dt) {
    this.mouse.lerp(this.mouseTarget, 1 - Math.pow(0.002, dt));
    this.bgMaterial.uniforms.uTime.value += dt;
    this.bgMaterial.uniforms.uMouse.value.copy(this.mouse);
    if (this.material) {
      const u = this.material.uniforms;
      u.uTime.value += dt;
      if (this.progress < 1) {
        this.progress = Math.min(1, this.progress + dt / 1.7);
        u.uProgress.value = this.progress;
        if (this.progress === 1) this.current = this.target;
      }
      this.timer += dt;
      if (this.timer > this.interval && this.progress === 1 && this.scroll < 0.6) this.setCharacter((this.target + 1) % this.count);

      // Pointer → face-local coordinates for the ripple.
      const ndc = new THREE.Vector3(this.mouse.x * 2 - 1, this.mouse.y * 2 - 1, 0.5).unproject(this.camera);
      const dir = ndc.sub(this.camera.position).normalize();
      const world = this.camera.position.clone().add(dir.multiplyScalar(-this.camera.position.z / dir.z));
      const local = this.group.worldToLocal(world);
      u.uPointer.value.lerp(new THREE.Vector2(local.x, local.y), 0.2);

      // Gentle head-turn toward the cursor, plus scroll tilt.
      const tx = (this.mouse.x - 0.5) * 0.5, ty = (this.mouse.y - 0.5) * 0.3;
      this.group.rotation.y += (tx - this.group.rotation.y) * 0.06;
      this.group.rotation.x += (-ty + this.scroll * 0.6 - this.group.rotation.x) * 0.06;
      u.uScroll.value += (this.scroll - u.uScroll.value) * 0.15;
    }
    this.bgMaterial.uniforms.uFade.value = this.scroll;
    this.render();
  }

  renderBg() {
    this.renderer.clear();
    this.renderer.render(this.bgScene, this.bgCamera);
  }
  render() {
    this.renderBg();
    if (this.points) this.renderer.render(this.scene, this.camera);
  }
  dispose() {
    this.disposed = true;
    this.points?.geometry.dispose();
    this.material?.dispose();
    this.bgMaterial.dispose();
    super.dispose();
  }
}

export function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch { return false; }
}
