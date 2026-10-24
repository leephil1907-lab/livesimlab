// Shared GLSL. Kept dependency-free so any Three.js material can use it.

export const NOISE = /* glsl */ `
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + 11.7; a *= 0.5; }
  return v;
}
`;

export const QUAD_VERT = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

// Interactive aurora: domain-warped fbm, mouse light, film grain.
export const GRADIENT_FRAG = /* glsl */ `
precision highp float;
uniform float uTime;
uniform vec2 uRes;
uniform vec2 uMouse;
uniform float uFade;
uniform float uIntensity;
varying vec2 vUv;
${NOISE}
void main(){
  vec2 uv = vUv;
  float ar = uRes.x / uRes.y;
  vec2 p = (uv - 0.5) * vec2(ar, 1.0);
  vec2 m = (uMouse - 0.5) * vec2(ar, 1.0);
  float t = uTime * 0.045;

  vec2 q = vec2(fbm(p * 1.3 + vec2(t, -t)), fbm(p * 1.3 + vec2(-t * 0.7, t) + 4.2));
  vec2 r = vec2(fbm(p * 1.1 + q * 1.7 + vec2(1.7, 9.2) + t * 0.5), fbm(p * 1.1 + q * 1.7 + vec2(8.3, 2.8) - t * 0.4));
  float n = fbm(p * 0.9 + r * 1.4);

  vec3 ink    = vec3(0.020, 0.022, 0.030);
  vec3 cobalt = vec3(0.180, 0.330, 0.960);
  vec3 violet = vec3(0.480, 0.300, 0.940);
  vec3 teal   = vec3(0.080, 0.620, 0.620);

  vec3 col = ink;
  col = mix(col, cobalt * 0.62, smoothstep(0.42, 0.88, n) * 0.95);
  col = mix(col, violet * 0.55, smoothstep(0.50, 0.92, r.x) * 0.75);
  col += teal * 0.11 * smoothstep(0.55, 1.0, q.y);

  // Cursor light.
  float md = length(p - m);
  col += mix(cobalt, violet, 0.5) * 0.22 * exp(-md * md * 4.0);

  // Vignette, fade and grain.
  col *= smoothstep(1.35, 0.15, length(p * vec2(0.75, 1.0)));
  col *= uIntensity * (1.0 - uFade * 0.75);
  col += (hash(uv * uRes + fract(uTime) * 100.0) - 0.5) * 0.028;
  gl_FragColor = vec4(col, 1.0);
}
`;

// Particle portrait: three faces stored as attributes, morphed with a top-down scan.
export const FACE_VERT = /* glsl */ `
attribute vec3 aPos0; attribute vec3 aPos1; attribute vec3 aPos2;
attribute vec4 aCol0; attribute vec4 aCol1; attribute vec4 aCol2;
attribute vec3 aRand; attribute vec2 aUv;
uniform vec3 uFrom; uniform vec3 uTo;
uniform float uProgress; uniform float uTime; uniform float uScroll;
uniform float uSize; uniform float uPixel; uniform vec2 uPointer;
varying vec4 vColor; varying float vGlow;

void main(){
  vec3 pf = aPos0 * uFrom.x + aPos1 * uFrom.y + aPos2 * uFrom.z;
  vec3 pt = aPos0 * uTo.x   + aPos1 * uTo.y   + aPos2 * uTo.z;
  vec4 cf = aCol0 * uFrom.x + aCol1 * uFrom.y + aCol2 * uFrom.z;
  vec4 ct = aCol0 * uTo.x   + aCol1 * uTo.y   + aCol2 * uTo.z;

  // The scan line sweeps top → bottom; each point flips when it passes.
  float d = clamp(uProgress * 1.55 - (1.0 - aUv.y) * 0.55, 0.0, 1.0);
  float e = smoothstep(0.0, 1.0, d);
  float burst = sin(e * 3.14159265);

  vec3 pos = mix(pf, pt, e);
  pos += (aRand - 0.5) * burst * vec3(0.18, 0.06, 0.55);

  // Breathing + cursor ripple.
  pos.z += sin(uTime * 1.3 + aUv.y * 7.0 + aUv.x * 3.0) * 0.014;
  vec2 diff = pos.xy - uPointer;
  pos.z += 0.16 * exp(-dot(diff, diff) * 14.0);

  // Scroll: the hologram dissolves outward.
  float s = uScroll * uScroll;
  pos += (aRand - 0.5) * vec3(4.0, 3.2, 5.0) * s;
  pos.y += s * aRand.y * 0.8;

  vec4 col = mix(cf, ct, e);
  vColor = col;
  vGlow = burst;

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * uPixel * (1.0 + burst * 0.9) / -mv.z;
}
`;

export const FACE_FRAG = /* glsl */ `
precision highp float;
uniform vec3 uAccent;
uniform float uScroll;
uniform float uAlpha;
varying vec4 vColor; varying float vGlow;
void main(){
  vec2 c = gl_PointCoord - 0.5;
  float r = length(c);
  if (r > 0.5) discard;
  float soft = smoothstep(0.5, 0.05, r);
  vec3 col = vColor.rgb * 1.08 + uAccent * vGlow * 0.85;
  float a = vColor.a * soft * uAlpha * (1.0 - uScroll * 0.95);
  gl_FragColor = vec4(col * a, a);
}
`;
