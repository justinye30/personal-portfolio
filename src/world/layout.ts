import { createNoise2D, fbm, lerp, smoothstep } from './noise';

// World layout (x → east, z → south, y → up). Every landmark the camera visits lives here
// so terrain, vegetation and camera shots all agree on where things are.

export const WORLD_SIZE = 560;
export const WATER_LEVEL = 0;

export const LAKE = { x: -8, z: -22, rx: 50, rz: 30 };
export const FOREST = { x: 82, z: -42, r: 52 };
export const FOREST_CLEARING = { x: 74, z: -30, r: 11 };
export const HILL = { x: -80, z: 40, r: 26, h: 15 };
export const CAMP = { x: 42, z: 50 };
export const STONES = { x: HILL.x, z: HILL.z };

const n1 = createNoise2D(11);
const n2 = createNoise2D(23);
const n3 = createNoise2D(37);
const n4 = createNoise2D(51);

export const noiseA = n1;
export const noiseB = n4;

// Dirt trails connecting the landmarks.
export const PATHS: [number, number][][] = [
  [[-4, 12], [6, 26], [22, 42], [36, 50]],
  [[6, 26], [-18, 36], [-44, 42], [-66, 41]],
  [[44, 44], [56, 22], [64, 0], [70, -20]],
];

export function lakeDistance(x: number, z: number) {
  const dx = (x - LAKE.x) / LAKE.rx;
  const dz = (z - LAKE.z) / LAKE.rz;
  const angle = Math.atan2(dz, dx);
  const wobble = 1 + 0.12 * n2(Math.cos(angle) * 1.3 + 4, Math.sin(angle) * 1.3 + 4);
  return Math.sqrt(dx * dx + dz * dz) / wobble;
}

function baseLand(x: number, z: number) {
  let h = 3.2 + fbm(n1, x * 0.011, z * 0.011, 4) * 5.5 + n2(x * 0.045, z * 0.045) * 0.7;

  const dh = Math.hypot(x - HILL.x, z - HILL.z);
  h += HILL.h * Math.exp(-((dh / HILL.r) ** 2));

  // mountain ring around the valley, taller to the north behind the lake
  const mx = x;
  const mz = z + 10;
  const r = Math.hypot(mx, mz);
  const north = smoothstep(0.1, -0.9, mz / Math.max(r, 1));
  const m = smoothstep(140, 235, r);
  if (m > 0) {
    const ridge = 1 - Math.abs(n3(x * 0.0085, z * 0.0085));
    const peaks = ridge * ridge;
    h += m * (12 + 44 * peaks + 10 * fbm(n3, x * 0.022, z * 0.022, 3)) * (0.55 + 0.65 * north);
  }
  return h;
}

const CAMP_H = baseLand(CAMP.x, CAMP.z);

export function heightAt(x: number, z: number) {
  let land = baseLand(x, z);

  // flatten the campsite
  const dc = Math.hypot(x - CAMP.x, z - CAMP.z);
  land = lerp(land, CAMP_H, smoothstep(16, 7, dc));

  // flatten the hilltop a little for the stone circle
  const ds = Math.hypot(x - STONES.x, z - STONES.z);
  land = lerp(land, baseLand(STONES.x, STONES.z) - 0.6, smoothstep(13, 4, ds) * 0.85);

  const d = lakeDistance(x, z);
  if (d > 1.45) return Math.max(land, 0.9);
  const shore = smoothstep(0.8, 1.32, d);
  const bed = -1.4 - 5 * (1 - Math.min(d, 1));
  return lerp(bed, Math.max(land, 0.9), shore);
}

function segDist(px: number, pz: number, ax: number, az: number, bx: number, bz: number) {
  const vx = bx - ax;
  const vz = bz - az;
  const t = Math.max(0, Math.min(1, ((px - ax) * vx + (pz - az) * vz) / (vx * vx + vz * vz)));
  return Math.hypot(px - (ax + vx * t), pz - (az + vz * t));
}

export function pathDistance(x: number, z: number) {
  let best = Infinity;
  for (const line of PATHS) {
    for (let i = 0; i < line.length - 1; i++) {
      const d = segDist(x, z, line[i][0], line[i][1], line[i + 1][0], line[i + 1][1]);
      if (d < best) best = d;
    }
  }
  // gentle meander
  return best + n4(x * 0.08, z * 0.08) * 0.8;
}

export function distanceToSegment(px: number, pz: number, a: [number, number], b: [number, number]) {
  return segDist(px, pz, a[0], a[1], b[0], b[1]);
}
