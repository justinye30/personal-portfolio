import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { createNoise2D, fbm, mulberry32, smoothstep } from './noise';

export const SUN_DIR = new THREE.Vector3(-0.8, 0.13, -0.56).normalize();

export const SKY = {
  top: new THREE.Color('#7d84cf'),
  mid: new THREE.Color('#c7a5d6'),
  horizon: new THREE.Color('#ffc4a6'),
  low: new THREE.Color('#e9b0b8'),
  sun: new THREE.Color('#ffd49a'),
  fog: new THREE.Color('#eab9b6'),
};

export function createSky() {
  const geo = new THREE.SphereGeometry(1500, 32, 24);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uTop: { value: SKY.top },
      uMid: { value: SKY.mid },
      uHorizon: { value: SKY.horizon },
      uLow: { value: SKY.low },
      uSun: { value: SKY.sun },
      uSunDir: { value: SUN_DIR },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uTop;
      uniform vec3 uMid;
      uniform vec3 uHorizon;
      uniform vec3 uLow;
      uniform vec3 uSun;
      uniform vec3 uSunDir;
      varying vec3 vDir;
      void main() {
        vec3 dir = normalize(vDir);
        float h = dir.y;
        float sd = max(dot(dir, uSunDir), 0.0);
        vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.28, h));
        col = mix(col, uTop, smoothstep(0.22, 0.85, h));
        col = mix(col, uLow, smoothstep(0.0, -0.25, h));
        // warm the horizon around the sun
        col = mix(col, uSun, pow(sd, 6.0) * 0.55 * (1.0 - smoothstep(0.0, 0.5, h)));
        col += uSun * pow(sd, 40.0) * 0.35;
        col = mix(col, vec3(1.0, 0.97, 0.9), smoothstep(0.9988, 0.9992, sd));
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }
    `,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'sky';
  mesh.renderOrder = -10;
  mesh.frustumCulled = false;
  return mesh;
}

function cloudGeometry(rand: () => number) {
  const parts: THREE.BufferGeometry[] = [];
  const puffs = 5 + Math.floor(rand() * 4);
  for (let i = 0; i < puffs; i++) {
    const t = (i / (puffs - 1)) * 2 - 1;
    const r = (0.75 + rand() * 0.45) * (1.1 - Math.abs(t) * 0.45);
    const g = new THREE.IcosahedronGeometry(r, 1);
    g.translate(t * 1.9 + (rand() - 0.5) * 0.4, (1 - Math.abs(t)) * 0.55 + rand() * 0.15, (rand() - 0.5) * 0.9);
    parts.push(g.index ? g.toNonIndexed() : g);
  }
  const merged = mergeGeometries(parts);
  merged.scale(1, 0.78, 1);
  parts.forEach((p) => p.dispose());
  return merged;
}

export function createClouds() {
  const group = new THREE.Group();
  group.name = 'clouds';
  const rand = mulberry32(77);
  const mat = new THREE.MeshLambertMaterial({
    color: '#fff6f4',
    emissive: '#f2b8c6',
    emissiveIntensity: 0.45,
    flatShading: true,
    fog: false,
    transparent: true,
    opacity: 0.9,
  });
  for (let i = 0; i < 16; i++) {
    const mesh = new THREE.Mesh(cloudGeometry(rand), mat);
    const a = rand() * Math.PI * 2;
    const r = 300 + rand() * 320;
    mesh.position.set(Math.cos(a) * r, 120 + rand() * 90, Math.sin(a) * r - 40);
    const s = 12 + rand() * 16;
    mesh.scale.set(s * (1.2 + rand() * 0.5), s, s);
    mesh.rotation.y = rand() * Math.PI;
    group.add(mesh);
  }
  return group;
}

// Two hazy ridgeline rings beyond the playable valley, built as a single strip so the
// silhouette reads as a mountain range rather than individual cones.
export function createDistantMountains() {
  const noise = createNoise2D(404);
  const positions: number[] = [];
  const colors: number[] = [];
  const layers = [
    { radius: 700, amp: 150, base: 30, low: new THREE.Color('#d8b4cc'), high: new THREE.Color('#f4e2ea'), k: 2.4, seed: 0 },
    { radius: 560, amp: 95, base: 10, low: new THREE.Color('#b29bcb'), high: new THREE.Color('#e9daf0'), k: 3.6, seed: 9 },
  ];
  const N = 220;
  for (const L of layers) {
    const ridge = (a: number) => {
      const x = Math.cos(a) * L.k + L.seed;
      const y = Math.sin(a) * L.k + L.seed;
      const r = 1 - Math.abs(fbm(noise, x, y, 3));
      return L.base + L.amp * r * r * r;
    };
    const col = (y: number, top: number) => {
      const t = smoothstep(0.55, 1, y / Math.max(top, 1)) * smoothstep(L.base + L.amp * 0.35, L.base + L.amp * 0.7, top);
      return L.low.clone().lerp(L.high, t);
    };
    for (let i = 0; i < N; i++) {
      const a0 = (i / N) * Math.PI * 2;
      const a1 = ((i + 1) / N) * Math.PI * 2;
      const h0 = ridge(a0);
      const h1 = ridge(a1);
      const pt = (a: number, h: number, inset: number) =>
        [Math.cos(a) * (L.radius - inset), h, Math.sin(a) * (L.radius - inset) - 40] as const;
      const rows = [
        [pt(a0, -40, -60), pt(a1, -40, -60)],
        [pt(a0, h0 * 0.55, 30 + (i % 3) * 8), pt(a1, h1 * 0.55, 30 + ((i + 1) % 3) * 8)],
        [pt(a0, h0, 55), pt(a1, h1, 55)],
      ];
      for (let rI = 0; rI < 2; rI++) {
        const [b0, b1] = rows[rI];
        const [t0, t1] = rows[rI + 1];
        // two triangles, wound to face the valley
        for (const tri of [[b0, t0, b1], [b1, t0, t1]]) {
          for (const v of tri) {
            positions.push(v[0], v[1], v[2]);
            const c = col(v[1], Math.max(h0, h1));
            colors.push(c.r, c.g, c.b);
          }
        }
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mat = new THREE.MeshLambertMaterial({
    vertexColors: true,
    flatShading: true,
    fog: false,
    side: THREE.DoubleSide,
    emissive: '#a48cbf',
    emissiveIntensity: 0.3,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'distant-mountains';
  return mesh;
}
