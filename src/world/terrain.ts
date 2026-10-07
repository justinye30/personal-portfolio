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

// Colour each (non-indexed) triangle from where it sits: grass, forest floor, trails,
// beach, rock on steep or high ground, snow on the peaks.
function colorFaces(geo: THREE.BufferGeometry, seed: number) {
  const p = geo.attributes.position as THREE.BufferAttribute;
  const n = geo.attributes.normal as THREE.BufferAttribute;
  const colors = new Float32Array(p.count * 3);
  const c = new THREE.Color();
  const tmp = new THREE.Color();
  const jitter = mulberry32(seed);

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
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}

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

  colorFaces(flat, 9);

  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  const mesh = new THREE.Mesh(flat, mat);
  mesh.receiveShadow = true;
  mesh.name = 'terrain';
  return mesh;
}

// Coarse mountains beyond the playable square, so looking out from any viewpoint finds the
// range carrying on to the distant ridgelines instead of the edge of the world.
const OUTER_STEP = 10;
const OUTER_RADIUS = 560;
const RING_CENTRE_Z = -40;

export function createOuterTerrain() {
  const half = WORLD_SIZE / 2;
  const n = Math.ceil((OUTER_RADIUS + 40) / OUTER_STEP);
  const rand = mulberry32(17);
  const vertex = (i: number, j: number) => {
    let x = i * OUTER_STEP;
    let z = j * OUTER_STEP;
    // jitter like the inner terrain, except along the seam where the two meshes meet
    const onSeam = Math.abs(x) <= half && Math.abs(z) <= half;
    if (!onSeam) {
      x += (rand() - 0.5) * OUTER_STEP * 0.5;
      z += (rand() - 0.5) * OUTER_STEP * 0.5;
    }
    let y = heightAt(x, z);
    // tuck the overlap under the detailed terrain so the two never z-fight
    if (Math.abs(x) < half && Math.abs(z) < half) y -= 4;
    return [x, y, z];
  };
  const grid: number[][][] = [];
  for (let i = -n; i <= n; i++) {
    const col: number[][] = [];
    for (let j = -n; j <= n; j++) col.push(vertex(i, j));
    grid.push(col);
  }

  const positions: number[] = [];
  for (let i = 0; i < 2 * n; i++) {
    for (let j = 0; j < 2 * n; j++) {
      const x0 = (i - n) * OUTER_STEP;
      const z0 = (j - n) * OUTER_STEP;
      // skip cells the detailed terrain already covers (keeping one cell of overlap)
      if (x0 >= -half + OUTER_STEP && x0 + OUTER_STEP <= half - OUTER_STEP && z0 >= -half + OUTER_STEP && z0 + OUTER_STEP <= half - OUTER_STEP) continue;
      if (Math.hypot(x0 + OUTER_STEP / 2, z0 + OUTER_STEP / 2 - RING_CENTRE_Z) > OUTER_RADIUS) continue;
      const a = grid[i][j];
      const b = grid[i + 1][j];
      const c = grid[i][j + 1];
      const d = grid[i + 1][j + 1];
      positions.push(...a, ...c, ...b, ...b, ...c, ...d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  colorFaces(geo, 19);
  const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  mesh.name = 'outer-terrain';
  return mesh;
}
