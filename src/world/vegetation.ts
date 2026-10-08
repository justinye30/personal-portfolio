import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  CABIN,
  CAMP,
  FOREST,
  FOREST_CLEARING,
  STONES,
  distanceToSegment,
  groundMin,
  heightAt,
  lakeDistance,
  noiseA,
  pathDistance,
} from './layout';
import { fbm, mulberry32, smoothstep } from './noise';
import { SHOTS } from './shots';

type Part = { geo: THREE.BufferGeometry; color: string };

function build(parts: Part[]) {
  const geos = parts.map(({ geo, color }) => {
    const g = geo.index ? geo.toNonIndexed() : geo;
    if (g !== geo) geo.dispose();
    const c = new THREE.Color(color);
    const arr = new Float32Array(g.attributes.position.count * 3);
    for (let i = 0; i < arr.length; i += 3) {
      arr[i] = c.r;
      arr[i + 1] = c.g;
      arr[i + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    g.deleteAttribute('uv');
    return g;
  });
  const merged = mergeGeometries(geos);
  geos.forEach((g) => g.dispose());
  merged.computeVertexNormals();
  return merged;
}

function pineGeometry() {
  const parts: Part[] = [
    { geo: new THREE.CylinderGeometry(0.28, 0.42, 2.6, 6).translate(0, 1.3, 0), color: '#6e4b3a' },
  ];
  const tiers = [
    [3.1, 4.0, 3.6, '#4f7d3f'],
    [2.5, 3.5, 5.5, '#5a8a45'],
    [1.85, 3.0, 7.3, '#67964c'],
    [1.15, 2.4, 8.9, '#76a253'],
  ] as const;
  tiers.forEach(([r, h, y, color], i) => {
    const cone = new THREE.ConeGeometry(r, h, 7, 1);
    cone.rotateY(i * 0.45);
    cone.translate(0, y, 0);
    parts.push({ geo: cone, color });
  });
  return build(parts);
}

function roundTreeGeometry() {
  const canopy = new THREE.IcosahedronGeometry(2.8, 0);
  canopy.scale(1.35, 0.62, 1.35);
  canopy.translate(0, 6.2, 0);
  const top = new THREE.IcosahedronGeometry(1.8, 0);
  top.scale(1.2, 0.6, 1.2);
  top.translate(0.6, 7.3, -0.3);
  return build([
    { geo: new THREE.CylinderGeometry(0.22, 0.38, 5.6, 5).translate(0, 2.8, 0), color: '#6b4a3a' },
    { geo: canopy, color: '#86a84c' },
    { geo: top, color: '#9bba58' },
  ]);
}

function bushGeometry() {
  const a = new THREE.IcosahedronGeometry(1.1, 0).scale(1, 0.78, 1).translate(0, 0.6, 0);
  const b = new THREE.IcosahedronGeometry(0.75, 0).scale(1, 0.8, 1).translate(0.9, 0.45, 0.3);
  return build([
    { geo: a, color: '#678d40' },
    { geo: b, color: '#749a47' },
  ]);
}

function rockGeometry(seed: number) {
  const rand = mulberry32(seed);
  const g = new THREE.DodecahedronGeometry(1, 0);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const offsets = new Map<string, [number, number, number]>();
  for (let i = 0; i < pos.count; i++) {
    const key = `${pos.getX(i).toFixed(3)},${pos.getY(i).toFixed(3)},${pos.getZ(i).toFixed(3)}`;
    if (!offsets.has(key)) offsets.set(key, [(rand() - 0.5) * 0.4, (rand() - 0.5) * 0.4, (rand() - 0.5) * 0.4]);
    const o = offsets.get(key)!;
    pos.setXYZ(i, pos.getX(i) + o[0], pos.getY(i) + o[1], pos.getZ(i) + o[2]);
  }
  g.scale(1.3, 0.75, 1);
  return build([{ geo: g, color: '#ffffff' }]);
}

export function slopeAt(x: number, z: number) {
  const e = 1.2;
  const dx = heightAt(x + e, z) - heightAt(x - e, z);
  const dz = heightAt(x, z + e) - heightAt(x, z - e);
  return Math.hypot(dx, dz) / (2 * e);
}

// Keep the camera stops and their lines of sight free of trees.
function inSightline(x: number, z: number, pad: number) {
  for (const s of SHOTS) {
    if (s.id === 'home') continue;
    const a: [number, number] = [s.pos[0], s.pos[2]];
    const b: [number, number] = [s.target[0], s.target[2]];
    if (distanceToSegment(x, z, a, b) < pad) return true;
    // keep the approach path clear too (e.g. the walk up to the cabin door)
    const pts = [...(s.waypoints ?? []), s.pos];
    for (let i = 0; i < pts.length - 1; i++) {
      if (distanceToSegment(x, z, [pts[i][0], pts[i][2]], [pts[i + 1][0], pts[i + 1][2]]) < pad) return true;
    }
  }
  return false;
}

class Grid {
  private cells = new Map<string, [number, number, number][]>();
  private size: number;
  constructor(size: number) {
    this.size = size;
  }
  private key(x: number, z: number) {
    return `${Math.floor(x / this.size)},${Math.floor(z / this.size)}`;
  }
  free(x: number, z: number, r: number) {
    const cx = Math.floor(x / this.size);
    const cz = Math.floor(z / this.size);
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        const list = this.cells.get(`${cx + i},${cz + j}`);
        if (!list) continue;
        for (const [px, pz, pr] of list) {
          if (Math.hypot(px - x, pz - z) < Math.max(r, pr)) return false;
        }
      }
    }
    return true;
  }
  add(x: number, z: number, r: number) {
    const k = this.key(x, z);
    if (!this.cells.has(k)) this.cells.set(k, []);
    this.cells.get(k)!.push([x, z, r]);
  }
}

function makeInstanced(geo: THREE.BufferGeometry, mat: THREE.Material, mats: THREE.Matrix4[], colors?: THREE.Color[]) {
  const mesh = new THREE.InstancedMesh(geo, mat, Math.max(mats.length, 1));
  mesh.count = mats.length;
  mats.forEach((m, i) => mesh.setMatrixAt(i, m));
  if (colors) colors.forEach((c, i) => mesh.setColorAt(i, c));
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
  return mesh;
}

// One instanced mesh is drawn whole whenever any of it is on screen, so instances are split
// into square patches the renderer can skip when they're out of view.
const PATCH = 120;
// beyond the playable square (the outer ranges' pines): drawn by the main camera only, kept
// out of the lake's reflection, which barely shows them
const OUTER_EDGE = 262;

function makePatches(geo: THREE.BufferGeometry, mat: THREE.Material, mats: THREE.Matrix4[], colors?: THREE.Color[]) {
  const patches = new Map<string, number[]>();
  mats.forEach((m, i) => {
    const x = m.elements[12];
    const z = m.elements[14];
    const outer = Math.abs(x) >= OUTER_EDGE || Math.abs(z) >= OUTER_EDGE;
    const key = `${Math.floor(x / PATCH)},${Math.floor(z / PATCH)},${outer ? 'o' : 'i'}`;
    let list = patches.get(key);
    if (!list) patches.set(key, (list = []));
    list.push(i);
  });
  return [...patches].map(([key, list]) => {
    const mesh = makeInstanced(geo, mat, list.map((i) => mats[i]), colors && list.map((i) => colors[i]));
    if (key.endsWith('o')) mesh.layers.set(1);
    return mesh;
  });
}

export function createVegetation(timeUniform: { value: number }) {
  const group = new THREE.Group();
  group.name = 'vegetation';
  const rand = mulberry32(2024);
  const grid = new Grid(6);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);

  const pines: THREE.Matrix4[] = [];
  const pineColors: THREE.Color[] = [];
  const rounds: THREE.Matrix4[] = [];
  const roundColors: THREE.Color[] = [];
  const bushes: THREE.Matrix4[] = [];
  const rocks: THREE.Matrix4[] = [];
  const rockColors: THREE.Color[] = [];

  const reserved = (x: number, z: number, pad: number) =>
    Math.hypot(x - CAMP.x, z - CAMP.z) < 17 + pad ||
    Math.hypot(x - CABIN.x, z - CABIN.z) < 11 + pad ||
    Math.hypot(x - STONES.x, z - STONES.z) < 15 + pad ||
    Math.hypot(x - FOREST_CLEARING.x, z - FOREST_CLEARING.z) < FOREST_CLEARING.r + pad ||
    inSightline(x, z, 4 + pad) ||
    pathDistance(x, z) < 3 + pad;

  // --- trees
  for (let i = 0; i < 26000; i++) {
    const x = (rand() - 0.5) * 520;
    const z = (rand() - 0.5) * 520;
    const h = heightAt(x, z);
    if (h < 1.1 || h > 30 || lakeDistance(x, z) < 1.12) continue;
    if (reserved(x, z, 0)) continue;

    const fd = Math.hypot(x - FOREST.x, z - FOREST.z);
    const r = Math.hypot(x, z + 10);
    const clusters = smoothstep(0.15, 0.6, fbm(noiseA, x * 0.018 + 30, z * 0.018 - 12, 3));
    let density = 0.01 + 0.2 * clusters;
    density += 0.95 * smoothstep(FOREST.r + 6, FOREST.r * 0.35, fd);
    density += 0.35 * smoothstep(120, 160, r) * smoothstep(30, 18, h);
    if (rand() > density) continue;
    if (slopeAt(x, z) > 0.75) continue;

    const forest = fd < FOREST.r + 10;
    const isPine = forest || r > 115 || rand() < 0.7;
    const radius = isPine ? 2.9 : 4;
    if (!grid.free(x, z, radius)) continue;
    grid.add(x, z, radius);

    const scale = (isPine ? 0.85 + rand() * 0.75 : 0.8 + rand() * 0.45) * (forest ? 1.15 : 1);
    q.setFromAxisAngle(up, rand() * Math.PI * 2);
    s.set(scale * (0.9 + rand() * 0.2), scale * (0.9 + rand() * 0.3), scale * (0.9 + rand() * 0.2));
    p.set(x, h - 0.35, z);
    m.compose(p, q, s);
    const tint = new THREE.Color().setHSL(0, 0, 0.88 + rand() * 0.22);
    if (isPine) {
      pines.push(m.clone());
      pineColors.push(tint);
    } else {
      rounds.push(m.clone());
      roundColors.push(tint);
    }
  }

  // --- sparse pine stands on the low slopes of the outer ranges (beyond the playable
  // square), so the forest doesn't stop dead at the world's edge. Own random stream so the
  // valley's scatter stays as it was.
  const outerRand = mulberry32(4048);
  for (let i = 0; i < 14000; i++) {
    const a = outerRand() * Math.PI * 2;
    const r = 255 + outerRand() * 210;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r - 40;
    if (Math.abs(x) < 262 && Math.abs(z) < 262) continue;
    const h = heightAt(x, z);
    if (h < 1.1 || h > 24) continue;
    const clusters = smoothstep(0.1, 0.5, fbm(noiseA, x * 0.018 + 30, z * 0.018 - 12, 3));
    if (outerRand() > 0.12 + 0.6 * clusters) continue;
    if (slopeAt(x, z) > 0.7) continue;
    if (!grid.free(x, z, 3.6)) continue;
    grid.add(x, z, 3.6);

    const scale = 1.1 + outerRand() * 0.8;
    q.setFromAxisAngle(up, outerRand() * Math.PI * 2);
    s.set(scale, scale * (0.9 + outerRand() * 0.3), scale);
    p.set(x, h - 0.5, z);
    m.compose(p, q, s);
    pines.push(m.clone());
    pineColors.push(new THREE.Color().setHSL(0, 0, 0.88 + outerRand() * 0.22));
  }

  // --- bushes & rocks
  for (let i = 0; i < 9000; i++) {
    const x = (rand() - 0.5) * 420;
    const z = (rand() - 0.5) * 420;
    const h = heightAt(x, z);
    if (h < 0.6 || h > 45) continue;
    const isRock = rand() < 0.45;
    const ld = lakeDistance(x, z);
    if (!isRock && ld < 1.12) continue;
    if (isRock && ld < 0.95) continue;
    if (reserved(x, z, -1.5)) continue;
    const shoreBoost = isRock ? smoothstep(1.4, 1.05, ld) * 0.5 : 0;
    if (rand() > 0.12 + shoreBoost) continue;
    if (!grid.free(x, z, 2)) continue;
    grid.add(x, z, 1.6);

    q.setFromAxisAngle(up, rand() * Math.PI * 2);
    const sc = isRock ? 0.5 + rand() * 1.6 : 0.7 + rand() * 0.7;
    s.set(sc, sc * (isRock ? 0.7 + rand() * 0.6 : 1), sc);
    // (decided after the random draws so the rest of the scatter stays put)
    // bushes don't cling to steep or rocky mountainsides; rocks sit on their lowest edge
    if (!isRock && (h > 30 || slopeAt(x, z) > 0.6)) continue;
    p.set(x, isRock ? groundMin(x, z, sc) - 0.25 * sc : h - 0.15, z);
    m.compose(p, q, s);
    if (isRock) {
      rocks.push(m.clone());
      rockColors.push(new THREE.Color('#9a8fa6').lerp(new THREE.Color('#7b7290'), rand()));
    } else {
      bushes.push(m.clone());
    }
  }

  const solidMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });

  const solids = [
    ...makePatches(pineGeometry(), solidMat, pines, pineColors),
    ...makePatches(roundTreeGeometry(), solidMat, rounds, roundColors),
    ...makePatches(bushGeometry(), solidMat, bushes),
    ...makePatches(rockGeometry(3), solidMat, rocks, rockColors),
  ];
  for (const mesh of solids) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  // --- grass tufts (swaying), only drawn by the main camera (layer 1)
  const blades: THREE.BufferGeometry[] = [];
  const bladeRand = mulberry32(8);
  for (let b = 0; b < 5; b++) {
    const a = (b / 5) * Math.PI * 2 + bladeRand();
    const r = 0.18 + bladeRand() * 0.12;
    const h = 0.7 + bladeRand() * 0.6;
    const ox = Math.cos(a) * r;
    const oz = Math.sin(a) * r;
    const lean = 0.25 + bladeRand() * 0.2;
    const w = 0.09;
    const tx = -Math.sin(a) * w;
    const tz = Math.cos(a) * w;
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      'position',
      new THREE.Float32BufferAttribute([ox - tx, 0, oz - tz, ox + tx, 0, oz + tz, ox * (1 + lean * 3), h, oz * (1 + lean * 3)], 3),
    );
    g.setAttribute('normal', new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
    const base = new THREE.Color('#71893a');
    const tip = new THREE.Color('#cfd27c');
    g.setAttribute('color', new THREE.Float32BufferAttribute([base.r, base.g, base.b, base.r, base.g, base.b, tip.r, tip.g, tip.b], 3));
    blades.push(g);
  }
  const tuftGeo = mergeGeometries(blades);
  blades.forEach((g) => g.dispose());

  const grassMat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  grassMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = timeUniform;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vec2 ip = vec2(instanceMatrix[3][0], instanceMatrix[3][2]);
        #else
          vec2 ip = vec2(0.0);
        #endif
        float sway = sin(uTime * 1.7 + ip.x * 0.13 + ip.y * 0.09) * 0.6 + sin(uTime * 3.1 + ip.x * 0.5) * 0.2;
        transformed.x += sway * 0.22 * position.y * position.y;
        transformed.z += sway * 0.1 * position.y * position.y;`,
      );
  };

  const grass: THREE.Matrix4[] = [];
  const flowers: THREE.Matrix4[] = [];
  const flowerColors: THREE.Color[] = [];
  const flowerPalette = ['#f7d7ee', '#c8a0ea', '#ffffff', '#f6df8e', '#f3a9c4'].map((c) => new THREE.Color(c));
  const hotspots = SHOTS.filter((sh) => sh.id !== 'home').map((sh) => [sh.pos[0], sh.pos[2]] as const);

  const tryPlace = (x: number, z: number, isFlower: boolean) => {
    const h = heightAt(x, z);
    if (h < 1.0 || h > 22) return;
    if (lakeDistance(x, z) < 1.13) return;
    if (pathDistance(x, z) < 2.2) return;
    if (Math.hypot(x - CAMP.x, z - CAMP.z) < 4.5) return;
    if (Math.hypot(x - CABIN.x, z - CABIN.z) < 9.5) return;
    for (const [hx, hz] of hotspots) if (Math.hypot(x - hx, z - hz) < 4) return;
    if (slopeAt(x, z) > 0.6) return;
    q.setFromAxisAngle(up, rand() * Math.PI * 2);
    const sc = isFlower ? 0.8 + rand() * 0.5 : 0.6 + rand() * 0.6;
    s.set(sc, sc * (isFlower ? 1 : 0.7 + rand() * 0.5), sc);
    p.set(x, h - 0.08, z);
    m.compose(p, q, s);
    if (isFlower) {
      flowers.push(m.clone());
      flowerColors.push(flowerPalette[Math.floor(rand() * flowerPalette.length)]);
    } else {
      grass.push(m.clone());
    }
  };

  for (let i = 0; i < 16000; i++) {
    const x = (rand() - 0.5) * 300;
    const z = (rand() - 0.5) * 300 + 10;
    const meadow = smoothstep(-0.2, 0.4, noiseA(x * 0.025 - 9, z * 0.025 + 4));
    if (rand() > 0.35 + meadow * 0.65) continue;
    tryPlace(x, z, rand() < 0.12);
  }
  for (const [hx, hz] of hotspots) {
    for (let i = 0; i < 1600; i++) {
      const a = rand() * Math.PI * 2;
      const r = Math.sqrt(rand()) * 34;
      tryPlace(hx + Math.cos(a) * r, hz + Math.sin(a) * r, rand() < 0.14);
    }
  }

  for (const mesh of makePatches(tuftGeo, grassMat, grass)) {
    mesh.receiveShadow = true;
    mesh.layers.set(1);
    group.add(mesh);
  }

  const flowerGeo = build([
    { geo: new THREE.CylinderGeometry(0.025, 0.025, 0.5, 3).translate(0, 0.25, 0), color: '#5f7b33' },
    { geo: new THREE.OctahedronGeometry(0.16, 0).translate(0, 0.55, 0), color: '#ffffff' },
  ]);
  const flowerMat = new THREE.MeshLambertMaterial({ vertexColors: true });
  for (const mesh of makePatches(flowerGeo, flowerMat, flowers, flowerColors)) {
    mesh.layers.set(1);
    group.add(mesh);
  }

  return group;
}
