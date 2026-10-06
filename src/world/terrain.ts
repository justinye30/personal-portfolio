import * as THREE from 'three';
import { FOREST, WORLD_SIZE, heightAt, lakeDistance, noiseA, noiseB, pathDistance } from './layout';
import { mulberry32, smoothstep } from './noise';

export const PALETTE = {
  grassLight: new THREE.Color('#c2cb6c'),
  grassMid: new THREE.Color('#9fb556'),
  grassDeep: new THREE.Color('#7f9f4a'),
  forestFloor: new THREE.Color('#678a42'),
  sand: new THREE.Color('#e6cda0'),
  wetSand: new THREE.Color('#b8a07e'),
  lakeBed: new THREE.Color('#7f9c8c'),
  dirt: new THREE.Color('#c9a273'),
  rock: new THREE.Color('#a99cb2'),
  rockDark: new THREE.Color('#857a98'),
  snow: new THREE.Color('#f7f0f4'),
};

export function createTerrain() {
  const seg = 176;
  const step = WORLD_SIZE / seg;
  const geo = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, seg, seg);
  geo.rotateX(-Math.PI / 2);

  const pos = geo.attributes.position as THREE.BufferAttribute;
  const rand = mulberry32(5);
  const half = WORLD_SIZE / 2 - 0.01;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let z = pos.getZ(i);
    const jx = (rand() - 0.5) * step * 0.5;
    const jz = (rand() - 0.5) * step * 0.5;
    if (Math.abs(x) < half) x += jx;
    if (Math.abs(z) < half) z += jz;
    pos.setXYZ(i, x, heightAt(x, z), z);
  }

  const flat = geo.toNonIndexed();
  geo.dispose();
  flat.computeVertexNormals();

  const p = flat.attributes.position as THREE.BufferAttribute;
  const n = flat.attributes.normal as THREE.BufferAttribute;
  const colors = new Float32Array(p.count * 3);
  const c = new THREE.Color();
  const tmp = new THREE.Color();
  const jitter = mulberry32(9);

  for (let f = 0; f < p.count; f += 3) {
    const cx = (p.getX(f) + p.getX(f + 1) + p.getX(f + 2)) / 3;
    const cy = (p.getY(f) + p.getY(f + 1) + p.getY(f + 2)) / 3;
    const cz = (p.getZ(f) + p.getZ(f + 1) + p.getZ(f + 2)) / 3;
    const slope = 1 - n.getY(f);
    const variation = noiseA(cx * 0.03 + 7, cz * 0.03 - 3);

    // grass base
    c.copy(PALETTE.grassMid).lerp(PALETTE.grassLight, smoothstep(-0.4, 0.6, variation));
    c.lerp(PALETTE.grassDeep, smoothstep(0.2, 0.8, noiseB(cx * 0.05, cz * 0.05)) * 0.6);

    const fd = Math.hypot(cx - FOREST.x, cz - FOREST.z);
    c.lerp(PALETTE.forestFloor, smoothstep(FOREST.r + 14, FOREST.r - 22, fd) * 0.85);

    const pd = pathDistance(cx, cz);
    if (pd < 2.1 && cy < 22) c.lerp(PALETTE.dirt, smoothstep(2.1, 1.1, pd));

    const ld = lakeDistance(cx, cz);
    if (ld < 1.5) {
      const sandAmt = smoothstep(1.4, 0.4, cy) * smoothstep(1.55, 1.0, ld);
      c.lerp(PALETTE.sand, sandAmt);
      if (cy < 0.1) c.copy(PALETTE.wetSand).lerp(PALETTE.lakeBed, smoothstep(0, -2.5, cy));
    }

    // rock on steep faces and up the mountains
    const rockAmt = Math.max(smoothstep(0.28, 0.5, slope), smoothstep(14, 26, cy + variation * 5));
    if (rockAmt > 0) {
      tmp.copy(PALETTE.rock).lerp(PALETTE.rockDark, smoothstep(-0.3, 0.5, noiseB(cx * 0.04, cz * 0.04)));
      c.lerp(tmp, rockAmt);
    }

    const snowAmt = smoothstep(40, 52, cy + variation * 8) * smoothstep(0.75, 0.45, slope);
    if (snowAmt > 0) c.lerp(PALETTE.snow, snowAmt);

    const j = 1 + (jitter() - 0.5) * 0.09;
    for (let k = 0; k < 3; k++) {
      colors[(f + k) * 3] = c.r * j;
      colors[(f + k) * 3 + 1] = c.g * j;
      colors[(f + k) * 3 + 2] = c.b * j;
    }
  }
  flat.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  const mesh = new THREE.Mesh(flat, mat);
  mesh.receiveShadow = true;
  mesh.name = 'terrain';
  return mesh;
}
