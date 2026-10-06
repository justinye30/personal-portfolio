import * as THREE from 'three';
import { heightAt } from './layout';
import { mulberry32 } from './noise';

interface ParticleOptions {
  count: number;
  center: [number, number];
  radius: number;
  height: [number, number];
  colors: string[];
  size: number;
  seed: number;
  rise?: number; // units per second, loops within `height`
  drift?: number; // wander amplitude
  blink?: boolean;
  additive?: boolean;
  followGround?: boolean;
}

export function createParticles(opts: ParticleOptions, uniforms: { uTime: { value: number }; uScale: { value: number } }) {
  const rand = mulberry32(opts.seed);
  const pos = new Float32Array(opts.count * 3);
  const col = new Float32Array(opts.count * 3);
  const seeds = new Float32Array(opts.count);
  const palette = opts.colors.map((c) => new THREE.Color(c));
  const span = opts.height[1] - opts.height[0];
  for (let i = 0; i < opts.count; i++) {
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(rand()) * opts.radius;
    const x = opts.center[0] + Math.cos(a) * r;
    const z = opts.center[1] + Math.sin(a) * r;
    const base = opts.followGround ? Math.max(heightAt(x, z), 0) : 0;
    pos[i * 3] = x;
    pos[i * 3 + 1] = base + opts.height[0] + (opts.rise ? 0 : rand() * span);
    pos[i * 3 + 2] = z;
    const c = palette[Math.floor(rand() * palette.length)];
    col.set([c.r, c.g, c.b], i * 3);
    seeds[i] = rand();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: opts.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    uniforms: {
      uTime: uniforms.uTime,
      uScale: uniforms.uScale,
      uSize: { value: opts.size },
      uRise: { value: opts.rise ?? 0 },
      uSpan: { value: span },
      uDrift: { value: opts.drift ?? 1 },
      uBlink: { value: opts.blink ? 1 : 0 },
    },
    vertexShader: /* glsl */ `
      attribute vec3 aColor;
      attribute float aSeed;
      uniform float uTime;
      uniform float uScale;
      uniform float uSize;
      uniform float uRise;
      uniform float uSpan;
      uniform float uDrift;
      uniform float uBlink;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vec3 p = position;
        float t = uTime + aSeed * 100.0;
        float life = 1.0;
        if (uRise > 0.0) {
          float y = mod(uTime * uRise * (0.6 + aSeed * 0.8) + aSeed * uSpan, uSpan);
          p.y += y;
          float k = y / uSpan;
          life = smoothstep(0.0, 0.1, k) * (1.0 - smoothstep(0.55, 1.0, k));
        }
        p.x += sin(t * 0.45 + aSeed * 6.28) * uDrift;
        p.z += cos(t * 0.37 + aSeed * 12.0) * uDrift;
        p.y += sin(t * 0.8) * uDrift * 0.4;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = clamp(uSize * uScale / -mv.z, 1.0, 22.0);
        gl_Position = projectionMatrix * mv;
        vColor = aColor;
        float blink = mix(1.0, 0.25 + 0.75 * pow(0.5 + 0.5 * sin(t * 2.4), 2.0), uBlink);
        vAlpha = life * blink * smoothstep(2.0, 9.0, -mv.z);
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.15, d) * vAlpha;
        if (a < 0.01) discard;
        gl_FragColor = vec4(vColor, a);
        #include <colorspace_fragment>
      }
    `,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.layers.set(1);
  return points;
}
