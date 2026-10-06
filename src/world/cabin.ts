import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CABIN } from './layout';
import { mulberry32 } from './noise';

// A cosy log cabin you can fly into. Everything static is merged into one
// vertex-coloured mesh; the door, fire, lights and TV screen stay separate.

export const FLOOR_Y = 0.35;
const LOG_R = 0.34;
const LOG_STEP = 0.62;
const WALL_H = 5.4;
const RISE = 4.4;
export const DOOR = { u0: 1.2, u1: 3.2, h: 3.5 };
// TV screen, in cabin-local space (used for the camera shot too)
export const TV = { x: -1.9, y: 2.92, z: -3.45, rot: 0.32, w: 2.3, h: 1.72, sx: -0.25, sz: 1.01 };

/** Cabin-local centre of the TV screen and its facing direction. */
export function tvScreenLocal() {
  const c = Math.cos(TV.rot);
  const s = Math.sin(TV.rot);
  return {
    pos: [TV.x + TV.sx * c + TV.sz * s, TV.y, TV.z - TV.sx * s + TV.sz * c] as [number, number, number],
    normal: [s, 0, c] as [number, number, number],
  };
}

class Builder {
  parts: THREE.BufferGeometry[] = [];
  private m = new THREE.Matrix4();
  private e = new THREE.Euler();
  private q = new THREE.Quaternion();

  put(geo: THREE.BufferGeometry, color: string, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, parent?: THREE.Matrix4) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    geo.dispose();
    this.e.set(rx, ry, rz);
    this.m.compose(new THREE.Vector3(x, y, z), this.q.setFromEuler(this.e), new THREE.Vector3(1, 1, 1));
    if (parent) this.m.premultiply(parent);
    g.applyMatrix4(this.m);
    const c = new THREE.Color(color);
    const arr = new Float32Array(g.attributes.position.count * 3);
    for (let i = 0; i < arr.length; i += 3) arr.set([c.r, c.g, c.b], i);
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    if (g.attributes.uv) g.deleteAttribute('uv');
    if (g.attributes.normal) g.deleteAttribute('normal');
    this.parts.push(g);
  }

  box(w: number, h: number, d: number, color: string, x: number, y: number, z: number, ry = 0, parent?: THREE.Matrix4) {
    this.put(new THREE.BoxGeometry(w, h, d), color, x, y, z, 0, ry, 0, parent);
  }

  build(mat: THREE.Material) {
    const merged = mergeGeometries(this.parts);
    this.parts.forEach((p) => p.dispose());
    merged.computeVertexNormals();
    const mesh = new THREE.Mesh(merged, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }
}

type Opening = { u0: number; u1: number; y0: number; y1: number };

const LOG_COLORS = ['#a8774f', '#9b6b45', '#b0805a', '#a27250'];

// Stack logs along one wall, leaving gaps for doors/windows.
function logWall(b: Builder, rand: () => number, length: number, offset: number, along: 'x' | 'z', fixed: number, openings: Opening[]) {
  const start = -length / 2 - 0.55;
  const end = length / 2 + 0.55;
  for (let y = FLOOR_Y + LOG_R + offset; y < WALL_H; y += LOG_STEP) {
    let cuts: [number, number][] = [[start, end]];
    for (const o of openings) {
      if (y + LOG_R * 0.6 < o.y0 || y - LOG_R * 0.6 > o.y1) continue;
      cuts = cuts.flatMap(([a, c]) => {
        const out: [number, number][] = [];
        if (o.u0 > a) out.push([a, Math.min(c, o.u0)]);
        if (o.u1 < c) out.push([Math.max(a, o.u1), c]);
        return out.filter(([p, q]) => q - p > 0.05);
      });
    }
    for (const [a, c] of cuts) {
      const len = c - a;
      const mid = (a + c) / 2;
      const color = LOG_COLORS[Math.floor(rand() * LOG_COLORS.length)];
      const geo = new THREE.CylinderGeometry(LOG_R, LOG_R, len, 7);
      if (along === 'x') b.put(geo, color, mid, y, fixed, 0, 0, Math.PI / 2);
      else b.put(geo, color, fixed, y, mid, Math.PI / 2, 0, 0);
    }
  }
}

function windowFrame(b: Builder, o: Opening, along: 'x' | 'z', fixed: number) {
  const w = o.u1 - o.u0;
  const h = o.y1 - o.y0;
  const cu = (o.u0 + o.u1) / 2;
  const cy = (o.y0 + o.y1) / 2;
  const frame = '#5e3f2c';
  const put = (bw: number, bh: number, u: number, y: number) => {
    if (along === 'x') b.box(bw, bh, LOG_R * 2.3, frame, u, y, fixed);
    else b.box(LOG_R * 2.3, bh, bw, frame, fixed, y, u);
  };
  put(w + 0.3, 0.16, cu, o.y0);
  put(w + 0.3, 0.16, cu, o.y1);
  put(0.16, h, o.u0, cy);
  put(0.16, h, o.u1, cy);
  put(0.08, h, cu, cy);
  put(w, 0.08, cu, cy);
}

function furniture(b: Builder, rand: () => number) {
  const W = CABIN.w;
  const D = CABIN.d;
  const dark = '#5a3b29';
  const mid = '#7a5236';

  // floor boards sit just proud of the slab (coplanar tops z-fight and flicker)
  for (let x = -W / 2; x < W / 2; x += 0.7) {
    b.box(0.68, 0.12, D, rand() > 0.5 ? '#8f6342' : '#86593b', x + 0.35, FLOOR_Y - 0.05, 0);
  }

  // rug
  b.put(new THREE.CylinderGeometry(2.9, 2.9, 0.04, 20).scale(1, 1, 0.7), '#a9483a', -0.9, FLOOR_Y + 0.02, -0.2);
  b.put(new THREE.CylinderGeometry(2.3, 2.3, 0.04, 20).scale(1, 1, 0.7), '#d9894a', -0.9, FLOOR_Y + 0.035, -0.2);
  b.put(new THREE.CylinderGeometry(1.6, 1.6, 0.04, 20).scale(1, 1, 0.7), '#ecc583', -0.9, FLOOR_Y + 0.05, -0.2);

  // coffee table + mug + book
  b.box(2.1, 0.14, 1.1, mid, -0.8, FLOOR_Y + 0.85, 0.3);
  for (const [lx, lz] of [[-1.7, -0.1], [0.1, -0.1], [-1.7, 0.7], [0.1, 0.7]]) b.box(0.12, 0.8, 0.12, dark, lx, FLOOR_Y + 0.4, lz);
  b.put(new THREE.CylinderGeometry(0.13, 0.12, 0.26, 8), '#e9e1d4', -0.3, FLOOR_Y + 1.05, 0.4);
  b.box(0.6, 0.1, 0.42, '#5c7fa6', -1.3, FLOOR_Y + 0.97, 0.2, 0.3);

  // TV cabinet (rotated toward the room)
  const tvM = new THREE.Matrix4().compose(
    new THREE.Vector3(TV.x, 0, TV.z),
    new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), TV.rot),
    new THREE.Vector3(1, 1, 1),
  );
  b.box(4.0, 1.3, 1.4, dark, 0, FLOOR_Y + 0.65, 0, 0, tvM);
  b.box(1.75, 0.95, 0.06, mid, -0.95, FLOOR_Y + 0.65, 0.71, 0, tvM);
  b.box(1.75, 0.95, 0.06, mid, 0.95, FLOOR_Y + 0.65, 0.71, 0, tvM);
  b.box(0.18, 0.08, 0.08, '#d9b26a', -0.3, FLOOR_Y + 0.8, 0.77, 0, tvM);
  b.box(0.18, 0.08, 0.08, '#d9b26a', 0.3, FLOOR_Y + 0.8, 0.77, 0, tvM);
  // vintage wooden TV
  const tvY = TV.y;
  b.box(3.3, 2.5, 1.9, '#6b4631', 0, tvY, -0.05, 0, tvM);
  b.box(2.7, 2.05, 0.1, '#2b211c', TV.sx, tvY, 0.94, 0, tvM);
  b.box(0.55, 2.0, 0.08, '#4a3427', 1.25, tvY, 0.94, 0, tvM);
  b.put(new THREE.CylinderGeometry(0.13, 0.13, 0.12, 10), '#d9b26a', 1.25, tvY + 0.5, 1.0, Math.PI / 2, 0, 0, tvM);
  b.put(new THREE.CylinderGeometry(0.13, 0.13, 0.12, 10), '#d9b26a', 1.25, tvY + 0.05, 1.0, Math.PI / 2, 0, 0, tvM);
  for (let i = 0; i < 4; i++) b.box(0.36, 0.05, 0.05, '#2b211c', 1.25, tvY - 0.45 - i * 0.12, 0.99, 0, tvM);
  // rabbit-ear antenna
  b.put(new THREE.SphereGeometry(0.22, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), '#3a3330', 0, tvY + 1.25, 0, 0, 0, 0, tvM);
  b.put(new THREE.CylinderGeometry(0.025, 0.025, 1.8, 4), '#b9b4ae', -0.4, tvY + 2.0, 0, 0, 0, 0.45, tvM);
  b.put(new THREE.CylinderGeometry(0.025, 0.025, 1.8, 4), '#b9b4ae', 0.4, tvY + 2.0, 0, 0, 0, -0.45, tvM);

  // potted plant next to the TV
  b.put(new THREE.CylinderGeometry(0.42, 0.32, 0.7, 8), '#c0673f', 1.5, FLOOR_Y + 0.35, -D / 2 + 1.2);
  b.put(new THREE.IcosahedronGeometry(0.75, 0).scale(1, 1.3, 1), '#5f8c45', 1.5, FLOOR_Y + 1.35, -D / 2 + 1.2);
  b.put(new THREE.IcosahedronGeometry(0.5, 0), '#73a052', 1.75, FLOOR_Y + 1.9, -D / 2 + 1.0);

  // picture frames on the back wall
  const wallZ = -D / 2 + LOG_R + 0.06;
  for (const [fx, fy, fw, fh, inner] of [[2.8, 3.6, 1.3, 1.0, '#8bb3c9'], [4.5, 3.4, 0.9, 1.2, '#e2a87a']] as const) {
    b.box(fw, fh, 0.08, '#4a3122', fx, fy, wallZ);
    b.box(fw - 0.22, fh - 0.22, 0.04, inner, fx, fy, wallZ + 0.05);
    b.box(fw - 0.5, (fh - 0.22) * 0.35, 0.03, '#7aa36a', fx, fy - (fh - 0.22) * 0.25, wallZ + 0.08);
  }

  // sofa on the right, facing the fire
  const sofaM = new THREE.Matrix4().compose(
    new THREE.Vector3(4.4, 0, -0.6),
    new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2 + 0.15),
    new THREE.Vector3(1, 1, 1),
  );
  const fabric = '#b8603f';
  b.box(3.4, 0.6, 1.3, fabric, 0, FLOOR_Y + 0.55, 0, 0, sofaM);
  b.box(3.4, 1.0, 0.35, '#a6553a', 0, FLOOR_Y + 1.2, -0.55, 0, sofaM);
  b.box(0.35, 0.75, 1.3, '#a6553a', -1.7, FLOOR_Y + 0.95, 0, 0, sofaM);
  b.box(0.35, 0.75, 1.3, '#a6553a', 1.7, FLOOR_Y + 0.95, 0, 0, sofaM);
  b.box(1.5, 0.22, 1.0, '#c97350', -0.78, FLOOR_Y + 0.95, 0.08, 0, sofaM);
  b.box(1.5, 0.22, 1.0, '#c97350', 0.78, FLOOR_Y + 0.95, 0.08, 0, sofaM);
  b.box(0.7, 0.6, 0.22, '#e8c27c', -1.1, FLOOR_Y + 1.35, -0.25, 0, sofaM);
  b.box(0.9, 0.08, 1.1, '#6d8fb0', 0.6, FLOOR_Y + 1.12, 0.1, 0, sofaM);

  // armchair by the fireplace
  const chairM = new THREE.Matrix4().compose(
    new THREE.Vector3(-4.0, 0, 1.9),
    new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.9),
    new THREE.Vector3(1, 1, 1),
  );
  const green = '#6f8a5a';
  b.box(1.4, 0.55, 1.3, green, 0, FLOOR_Y + 0.55, 0, 0, chairM);
  b.box(1.4, 1.2, 0.3, '#627d4f', 0, FLOOR_Y + 1.35, -0.55, 0, chairM);
  b.box(0.28, 0.65, 1.3, '#627d4f', -0.7, FLOOR_Y + 1.0, 0, 0, chairM);
  b.box(0.28, 0.65, 1.3, '#627d4f', 0.7, FLOOR_Y + 1.0, 0, 0, chairM);
  b.box(1.0, 0.18, 1.0, '#7e9a68', 0, FLOOR_Y + 0.92, 0.08, 0, chairM);

  // bookshelf on the right wall
  const sx = W / 2 - LOG_R - 0.45;
  b.box(0.8, 4.0, 2.8, dark, sx, FLOOR_Y + 2.0, -3.0);
  const bookColors = ['#b5523b', '#e2b25a', '#5c7fa6', '#6f8a5a', '#d9d0c1', '#8a5a8f', '#c97350'];
  for (let s = 0; s < 4; s++) {
    const y = FLOOR_Y + 0.3 + s * 0.95;
    b.box(0.7, 0.08, 2.6, mid, sx - 0.05, y, -3.0);
    let z = -4.25;
    while (z < -1.8) {
      const bw = 0.12 + rand() * 0.12;
      const bh = 0.5 + rand() * 0.28;
      b.box(0.5, bh, bw, bookColors[Math.floor(rand() * bookColors.length)], sx - 0.1, y + 0.04 + bh / 2, z + bw / 2);
      z += bw + 0.02;
      if (rand() > 0.85) z += 0.3;
    }
  }

  // floor lamp behind the sofa
  b.put(new THREE.CylinderGeometry(0.3, 0.38, 0.12, 8), dark, 5.2, FLOOR_Y + 0.06, 1.9);
  b.put(new THREE.CylinderGeometry(0.05, 0.05, 2.7, 6), dark, 5.2, FLOOR_Y + 1.4, 1.9);

  // stacked firewood by the hearth
  for (let i = 0; i < 7; i++) {
    const row = i < 4 ? 0 : 1;
    const k = row === 0 ? i : i - 4;
    b.put(new THREE.CylinderGeometry(0.17, 0.17, 1.1, 6), rand() > 0.5 ? '#7a5236' : '#8c6040', -W / 2 + 0.9, FLOOR_Y + 0.18 + row * 0.32, -3.1 - k * 0.36 - row * 0.18, Math.PI / 2, 0, 0);
  }
}

export function createCabin() {
  const group = new THREE.Group();
  group.name = 'cabin';
  const rand = mulberry32(606);
  const W = CABIN.w;
  const D = CABIN.d;
  const b = new Builder();

  const frontOpenings: Opening[] = [
    { u0: DOOR.u0, u1: DOOR.u1, y0: FLOOR_Y, y1: FLOOR_Y + DOOR.h },
    { u0: -4.6, u1: -1.9, y0: 1.9, y1: 3.7 },
  ];
  const rightOpenings: Opening[] = [{ u0: 0.6, u1: 3.0, y0: 1.9, y1: 3.7 }];
  const backOpenings: Opening[] = [{ u0: 3.0, u1: 5.0, y0: 2.0, y1: 3.0 }];

  logWall(b, rand, W, 0, 'x', D / 2, frontOpenings);
  logWall(b, rand, W, 0, 'x', -D / 2, backOpenings);
  logWall(b, rand, D, LOG_STEP / 2, 'z', -W / 2, []);
  logWall(b, rand, D, LOG_STEP / 2, 'z', W / 2, rightOpenings);
  windowFrame(b, frontOpenings[1], 'x', D / 2);
  windowFrame(b, rightOpenings[0], 'z', W / 2);
  windowFrame(b, backOpenings[0], 'x', -D / 2);
  // door frame
  b.box(0.18, DOOR.h + 0.1, LOG_R * 2.3, '#5e3f2c', DOOR.u0 - 0.05, FLOOR_Y + DOOR.h / 2, D / 2);
  b.box(0.18, DOOR.h + 0.1, LOG_R * 2.3, '#5e3f2c', DOOR.u1 + 0.05, FLOOR_Y + DOOR.h / 2, D / 2);
  b.box(DOOR.u1 - DOOR.u0 + 0.4, 0.22, LOG_R * 2.3, '#5e3f2c', (DOOR.u0 + DOOR.u1) / 2, FLOOR_Y + DOOR.h + 0.05, D / 2);

  // floor slab + porch step
  b.box(W + 0.4, FLOOR_Y + 0.4, D + 0.4, '#6e4b35', 0, (FLOOR_Y - 0.4) / 2 - 0.03, 0);
  b.box(3.0, 0.3, 1.4, '#7a5236', (DOOR.u0 + DOOR.u1) / 2, 0.15, D / 2 + 0.9);

  // gables
  const wallTop = WALL_H + 0.05;
  const gable = new THREE.Shape();
  gable.moveTo(-W / 2 - 0.35, 0);
  gable.lineTo(W / 2 + 0.35, 0);
  gable.lineTo(0, RISE);
  gable.closePath();
  for (const z of [D / 2, -D / 2]) {
    const g = new THREE.ExtrudeGeometry(gable, { depth: 0.5, bevelEnabled: false });
    g.translate(0, 0, -0.25);
    b.put(g, '#94653f', 0, wallTop - 0.1, z);
    // board lines on the gable
    for (let i = 1; i < 6; i++) {
      const y = (i / 6) * RISE;
      const halfW = (W / 2 + 0.35) * (1 - y / RISE);
      b.box(halfW * 2, 0.06, 0.56, '#7d5434', 0, wallTop - 0.1 + y, z);
    }
  }
  // round attic window on the front gable
  b.put(new THREE.CylinderGeometry(0.55, 0.55, 0.6, 12), '#5e3f2c', 0, wallTop + 1.4, D / 2, Math.PI / 2, 0, 0);
  b.put(new THREE.CylinderGeometry(0.42, 0.42, 0.62, 12), '#ffd28a', 0, wallTop + 1.4, D / 2, Math.PI / 2, 0, 0);

  // roof: two slabs + shingle courses, with a warm wooden ceiling underneath
  const run = W / 2 + 0.35;
  const theta = Math.atan2(RISE, run);
  const over = 1.0;
  const slabW = (run + over) / Math.cos(theta);
  const ridgeY = wallTop - 0.1 + RISE;
  for (const side of [-1, 1]) {
    const cx = side * ((run + over) / 2);
    const cy = ridgeY - ((run + over) / 2) * Math.tan(theta);
    const nx = side * Math.sin(theta);
    const ny = Math.cos(theta);
    const rot = -side * theta;
    b.put(new THREE.BoxGeometry(slabW, 0.32, D + 1.6), '#7e4540', cx + nx * 0.22, cy + ny * 0.22, 0, 0, 0, rot);
    for (let i = 0; i < 6; i++) {
      const t = (i + 0.5) / 6 - 0.5;
      const ox = Math.cos(theta) * slabW * t * side;
      const oy = -Math.sin(theta) * slabW * t;
      b.put(new THREE.BoxGeometry(slabW / 6 + 0.05, 0.1, D + 1.7), i % 2 ? '#8c4b45' : '#743e3a', cx + ox + nx * 0.42, cy + oy + ny * 0.42, 0, 0, 0, rot);
    }
    b.put(new THREE.BoxGeometry(slabW - 0.6, 0.12, D - 0.2), '#8d5f3e', cx - nx * 0.3, cy - ny * 0.3 - 0.05, 0, 0, 0, rot);
  }
  b.box(0.5, 0.5, D + 1.8, '#5e3f2c', 0, ridgeY + 0.35, 0);
  // ceiling beams
  for (const z of [-3, 0, 3]) b.box(W, 0.42, 0.42, '#5e3f2c', 0, wallTop - 0.2, z);
  b.box(0.42, 0.42, D, '#5e3f2c', 0, ridgeY - 0.6, 0);

  // chimney + fireplace on the left wall
  const stoneCol = ['#9a8f9f', '#8a8091', '#a69bab'];
  b.box(1.5, ridgeY + 1.8, 2.6, '#958a9c', -W / 2 - 0.85, (ridgeY + 1.8) / 2, -0.8);
  for (let i = 0; i < 14; i++) {
    b.box(0.25, 0.45, 0.7 + rand() * 0.4, stoneCol[i % 3], -W / 2 - 1.6, 0.6 + i * 0.75, -0.8 + (rand() - 0.5) * 1.6);
  }
  const hx = -W / 2 + LOG_R + 0.7;
  b.box(1.4, 3.4, 3.4, '#958a9c', hx, FLOOR_Y + 1.7, -0.8);
  b.box(1.0, ridgeY - 3.4, 2.4, '#8a8091', hx - 0.2, FLOOR_Y + 3.4 + (ridgeY - 3.4) / 2, -0.8);
  b.box(0.1, 1.5, 2.0, '#2a1d1a', hx + 0.66, FLOOR_Y + 1.0, -0.8);
  b.box(1.7, 0.22, 3.8, '#5a3b29', hx + 0.15, FLOOR_Y + 3.3, -0.8);
  b.box(1.6, 0.25, 3.6, '#a69bab', hx + 0.2, FLOOR_Y + 0.12, -0.8);
  // mantel trinkets
  b.put(new THREE.CylinderGeometry(0.12, 0.12, 0.5, 8), '#f1e6d0', hx + 0.3, FLOOR_Y + 3.66, -1.9);
  b.put(new THREE.CylinderGeometry(0.12, 0.12, 0.35, 8), '#f1e6d0', hx + 0.3, FLOOR_Y + 3.59, -1.6);
  b.box(0.1, 0.8, 0.6, '#4a3122', hx + 0.2, FLOOR_Y + 3.8, 0.2);
  b.box(0.04, 0.6, 0.42, '#c9a8d8', hx + 0.26, FLOOR_Y + 3.8, 0.2);
  // logs in the firebox
  b.put(new THREE.CylinderGeometry(0.14, 0.14, 1.4, 6), '#4a3122', hx + 0.5, FLOOR_Y + 0.4, -0.8, Math.PI / 2, 0.3, 0);
  b.put(new THREE.CylinderGeometry(0.14, 0.14, 1.4, 6), '#4a3122', hx + 0.5, FLOOR_Y + 0.4, -0.8, Math.PI / 2, -0.3, 0);

  // exterior lantern by the door + firewood pile outside
  b.box(0.12, 0.6, 0.3, '#4a3122', DOOR.u1 + 0.8, 3.0, D / 2 + 0.45);
  for (let i = 0; i < 5; i++) {
    b.put(new THREE.CylinderGeometry(0.22, 0.22, 1.6, 6), '#7a5236', W / 2 + 0.8, 0.25 + (i % 2) * 0.38, 2.5 - i * 0.42, Math.PI / 2, 0, 0);
  }

  furniture(b, rand);

  const solid = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  const body = b.build(solid);
  group.add(body);

  // glowing bits
  const glow = new THREE.MeshBasicMaterial({ color: '#ffd28a' });
  const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.44, 0.34), glow);
  lantern.position.set(DOOR.u1 + 0.8, 2.6, D / 2 + 0.6);
  group.add(lantern);
  const shade = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.55, 0.6, 8, 1, true),
    new THREE.MeshBasicMaterial({ color: '#ffe0aa', side: THREE.DoubleSide }),
  );
  shade.position.set(5.2, FLOOR_Y + 2.85, 1.9);
  group.add(shade);

  // the door, hinged on its left edge so it swings inward
  const door = new THREE.Group();
  door.position.set(DOOR.u0, FLOOR_Y, D / 2 - 0.05);
  const db = new Builder();
  const dw = DOOR.u1 - DOOR.u0;
  for (let i = 0; i < 4; i++) {
    db.box(dw / 4 - 0.02, DOOR.h - 0.05, 0.16, i % 2 ? '#7a5236' : '#6e4a31', (i + 0.5) * (dw / 4), DOOR.h / 2, 0);
  }
  db.box(dw - 0.1, 0.18, 0.2, '#4a3122', dw / 2, DOOR.h * 0.25, 0.04);
  db.box(dw - 0.1, 0.18, 0.2, '#4a3122', dw / 2, DOOR.h * 0.75, 0.04);
  db.box(0.12, 0.3, 0.12, '#d9b26a', dw - 0.25, DOOR.h * 0.5, 0.15);
  door.add(db.build(solid));
  group.add(door);

  // hearth fire
  const flames = new THREE.Group();
  ['#ff7a32', '#ffa53d', '#ffdb7a'].forEach((c, i) => {
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.42 - i * 0.1, 1.15 - i * 0.22, 5), new THREE.MeshBasicMaterial({ color: c }));
    f.position.set(hx + 0.45 + i * 0.03, FLOOR_Y + 0.85 - i * 0.04, -0.8 + (i - 1) * 0.18);
    flames.add(f);
  });
  group.add(flames);

  const fireLight = new THREE.PointLight('#ff9a58', 13, 16, 1.3);
  fireLight.position.set(hx + 1.4, FLOOR_Y + 1.5, -0.8);
  group.add(fireLight);
  const lampLight = new THREE.PointLight('#ffd49a', 7, 12, 1.3);
  lampLight.position.set(5.0, FLOOR_Y + 2.6, 1.7);
  group.add(lampLight);

  // TV screen placeholder; the World swaps in the CRT material
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(TV.w, TV.h));
  const tvGroup = new THREE.Group();
  tvGroup.position.set(TV.x, 0, TV.z);
  tvGroup.rotation.y = TV.rot;
  screen.position.set(TV.sx, TV.y, TV.sz);
  tvGroup.add(screen);
  group.add(tvGroup);

  const update = (t: number, open: number) => {
    door.rotation.y = open * 1.85;
    flames.children.forEach((f, i) => {
      f.scale.set(1 + Math.sin(t * 8 + i) * 0.08, 1 + Math.sin(t * (10 + i * 3) + i) * 0.14, 1);
      f.rotation.y += 0.03;
    });
    fireLight.intensity = 12 + Math.sin(t * 9) * 2 + Math.sin(t * 21) * 1;
  };

  return { group, screen, update };
}
