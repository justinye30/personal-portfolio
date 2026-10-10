import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { createCabin } from './cabin';
import { createInscription } from './inscription';
import { CABIN, CABIN_Y, CAMP, LAKE, STONES, TABLET_SLOT, groundMin, heightAt } from './layout';
import { stoneMaterial } from './materials';
import { mulberry32 } from './noise';

const wood = new THREE.MeshLambertMaterial({ color: '#a2724f', flatShading: true });
const darkWood = new THREE.MeshLambertMaterial({ color: '#6f4b37', flatShading: true });
const stone = stoneMaterial;
const glow = new THREE.MeshBasicMaterial({ color: '#ffd28a' });

function add(group: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) {
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

// Collects static pieces (each painted its material's colour) and merges them into one
// vertex-coloured mesh, so a prop built from dozens of parts costs a single draw call.
class Merger {
  private parts: THREE.BufferGeometry[] = [];
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private one = new THREE.Vector3(1, 1, 1);

  add(geo: THREE.BufferGeometry, color: THREE.Color, x: number, y: number, z: number, rotation = new THREE.Euler()) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    g.deleteAttribute('uv');
    g.deleteAttribute('normal');
    g.applyMatrix4(this.m.compose(new THREE.Vector3(x, y, z), this.q.setFromEuler(rotation), this.one));
    const arr = new Float32Array(g.attributes.position.count * 3);
    for (let i = 0; i < arr.length; i += 3) arr.set([color.r, color.g, color.b], i);
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    this.parts.push(g);
  }

  build(mat: THREE.Material) {
    const merged = mergeGeometries(this.parts)!;
    this.parts.forEach((p) => p.dispose());
    merged.computeVertexNormals();
    return new THREE.Mesh(merged, mat);
  }
}

const solid = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });

function jitteredStone(w: number, h: number, d: number, seed: number) {
  const rand = mulberry32(seed);
  const g = new THREE.BoxGeometry(w, h, d, 1, 2, 1);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const offsets = new Map<string, number[]>();
  for (let i = 0; i < pos.count; i++) {
    const key = `${pos.getX(i).toFixed(2)},${pos.getY(i).toFixed(2)},${pos.getZ(i).toFixed(2)}`;
    if (!offsets.has(key)) offsets.set(key, [(rand() - 0.5) * w * 0.35, (rand() - 0.5) * 0.3, (rand() - 0.5) * d * 0.35]);
    const o = offsets.get(key)!;
    const taper = pos.getY(i) > 0 ? 0.8 : 1;
    pos.setXYZ(i, pos.getX(i) * taper + o[0], pos.getY(i) + o[1], pos.getZ(i) * taper + o[2]);
  }
  const flat = g.toNonIndexed();
  g.dispose();
  flat.computeVertexNormals();
  return flat;
}

function createDock() {
  const group = new THREE.Group();
  group.name = 'dock';
  const x = -1;
  // find the shoreline walking north from land
  let shoreZ = 20;
  for (let z = 20; z > LAKE.z; z -= 0.25) {
    if (heightAt(x, z) < 0.35) {
      shoreZ = z;
      break;
    }
  }
  const start = shoreZ + 4;
  const end = shoreZ - 13;
  const deckY = 0.85;
  const rand = mulberry32(42);
  // planks, posts, the lantern's pole and cap: one mesh
  const deck = new Merger();
  const plank = new THREE.BoxGeometry(2.8, 0.14, 0.5);
  for (let z = start; z > end; z -= 0.58) {
    const color = rand() > 0.15 ? wood.color : darkWood.color;
    const y = deckY + (rand() - 0.5) * 0.05;
    deck.add(plank, color, x, y, z, new THREE.Euler(0, (rand() - 0.5) * 0.04, 0));
  }
  const post = new THREE.CylinderGeometry(0.13, 0.15, 3.2, 6);
  for (let z = start - 0.5; z > end; z -= 3.4) {
    deck.add(post, darkWood.color, x - 1.35, deckY - 1.1, z);
    deck.add(post, darkWood.color, x + 1.35, deckY - 1.1, z);
  }
  // lantern at the end of the dock
  deck.add(new THREE.CylinderGeometry(0.09, 0.11, 2.2, 6), darkWood.color, x + 1.2, deckY + 1.1, end + 0.6);
  deck.add(new THREE.ConeGeometry(0.38, 0.3, 4), darkWood.color, x + 1.2, deckY + 2.85, end + 0.6, new THREE.Euler(0, Math.PI / 4, 0));
  const deckMesh = deck.build(solid);
  deckMesh.castShadow = true;
  deckMesh.receiveShadow = true;
  group.add(deckMesh);
  const lantern = add(group, new THREE.BoxGeometry(0.42, 0.55, 0.42), glow, x + 1.2, deckY + 2.45, end + 0.6);
  lantern.castShadow = false;

  // little rowboat tied to the dock (one mesh, so it can bob)
  const hull = new Merger();
  const hullGeo = new THREE.SphereGeometry(1, 8, 4, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
  hullGeo.scale(1.15, 0.55, 2.7);
  hull.add(hullGeo, new THREE.Color('#c0664a'), 0, 0, 0);
  hull.add(new THREE.BoxGeometry(2.1, 0.1, 0.5), wood.color, 0, -0.12, 0);
  const boat = hull.build(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide }));
  boat.castShadow = true;
  boat.position.set(x + 3.4, 0.38, end + 3.5);
  boat.rotation.y = 0.18;
  group.add(boat);

  return { group, boat };
}

function createCampfire() {
  const group = new THREE.Group();
  group.name = 'campfire';
  const rand = mulberry32(7);
  // ring stones, firewood and seating logs: one mesh
  const pit = new Merger();
  const rock = new THREE.DodecahedronGeometry(0.42, 0);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    pit.add(rock, stone.color, Math.cos(a) * 1.4, 0.15, Math.sin(a) * 1.4, new THREE.Euler(rand() * 3, rand() * 3, rand() * 3));
  }
  const log = new THREE.CylinderGeometry(0.16, 0.18, 2.2, 6);
  for (let i = 0; i < 4; i++) {
    pit.add(log, darkWood.color, 0, 0.45, 0, new THREE.Euler(0.9, (i / 4) * Math.PI * 2, 0, 'YXZ'));
  }
  const flames = new THREE.Group();
  const flameColors = ['#ff8a3d', '#ffb347', '#ffe08a'];
  flameColors.forEach((c, i) => {
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.75 - i * 0.2, 2 - i * 0.4, 5), new THREE.MeshBasicMaterial({ color: c }));
    f.position.y = 0.95 - i * 0.05;
    f.rotation.y = i;
    flames.add(f);
  });
  group.add(flames);

  // seating logs
  const bench = new THREE.CylinderGeometry(0.42, 0.42, 3.2, 7).rotateZ(Math.PI / 2);
  pit.add(bench, wood.color, 0, 0.4, 4.2, new THREE.Euler(0, 0.15, 0));
  pit.add(bench, wood.color, -4.1, 0.4, 0.6, new THREE.Euler(0, Math.PI / 2 + 0.2, 0));
  const pitMesh = pit.build(solid);
  pitMesh.castShadow = true;
  pitMesh.receiveShadow = true;
  group.add(pitMesh);

  const light = new THREE.PointLight('#ff9a4f', 40, 34, 1.4);
  light.position.set(0, 2.2, 0);
  group.add(light);
  return { group, flames, light };
}

function createStoneCircle(centerY: number) {
  const group = new THREE.Group();
  // local height of the ground under a stone, sunk a little so its base is buried
  const seat = (x: number, z: number, r: number) => groundMin(STONES.x + x, STONES.z + z, r) - centerY - 0.6;
  group.name = 'stones';
  const rand = mulberry32(13);
  const count = 11;
  const radius = 8.5;
  const pillars: { i: number; x: number; z: number; top: number }[] = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + rand() * 0.1;
    const x = Math.cos(a) * radius;
    const z = Math.sin(a) * radius;
    // this slot holds the inscribed stone (see inscription.ts)
    if (i === TABLET_SLOT) continue;
    if (i === 7) {
      // a fallen stone
      const m = add(group, jitteredStone(1.5, 4.6, 1, i + 1), stone, x, seat(x, z, 2.4) + 0.95, z);
      m.rotation.set(Math.PI / 2 - 0.1, a, 0.2);
      continue;
    }
    const h = 4.2 + rand() * 2.2;
    const base = seat(x, z, 1.0);
    pillars.push({ i, x, z, top: base + h });
    const m = add(group, jitteredStone(1.5, h, 1, i + 1), stone, x, base + h / 2, z);
    m.rotation.y = -a + Math.PI / 2;
    m.rotation.z = (rand() - 0.5) * 0.08;
  }
  // lintels across two pairs
  for (const [ia, ib] of [[0, 1], [4, 5]]) {
    const pa = pillars.find((p) => p.i === ia)!;
    const pb = pillars.find((p) => p.i === ib)!;
    const top = Math.min(pa.top, pb.top) - 0.25;
    const lintel = add(group, jitteredStone(Math.hypot(pa.x - pb.x, pa.z - pb.z) + 1.6, 0.8, 1.1, 90 + ia), stone, (pa.x + pb.x) / 2, top, (pa.z + pb.z) / 2);
    lintel.rotation.y = -Math.atan2(pb.z - pa.z, pb.x - pa.x);
  }
  // altar + floating crystal
  add(group, jitteredStone(2.6, 0.9, 1.6, 77), stone, 0, seat(0, 0, 1.4) + 0.75, 0);
  const crystal = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.75, 0),
    new THREE.MeshLambertMaterial({ color: '#d9b8ff', emissive: '#a777ff', emissiveIntensity: 1.4, flatShading: true }),
  );
  crystal.scale.set(1, 1.6, 1);
  crystal.position.y = 2.9;
  group.add(crystal);
  return { group, crystal };
}

export function createProps() {
  const group = new THREE.Group();
  group.name = 'props';

  const dock = createDock();
  group.add(dock.group);

  const campY = heightAt(CAMP.x, CAMP.z);
  const fire = createCampfire();
  fire.group.position.set(CAMP.x, campY, CAMP.z);
  group.add(fire.group);

  const cabin = createCabin();
  cabin.group.position.set(CABIN.x, CABIN_Y, CABIN.z);
  cabin.group.rotation.y = CABIN.rot;
  group.add(cabin.group);

  const stonesY = heightAt(STONES.x, STONES.z);
  const stones = createStoneCircle(stonesY);
  stones.group.position.set(STONES.x, stonesY, STONES.z);
  group.add(stones.group);
  group.add(createInscription());

  const update = (t: number, doorOpen: number) => {
    cabin.update(t, doorOpen);
    fire.flames.children.forEach((f, i) => {
      const k = 1 + Math.sin(t * (9 + i * 3) + i) * 0.12 + Math.sin(t * 17 + i * 2) * 0.06;
      f.scale.set(1 + Math.sin(t * 7 + i) * 0.06, k, 1 + Math.cos(t * 6 + i) * 0.06);
      f.rotation.y += 0.02 + i * 0.01;
    });
    fire.light.intensity = 38 + Math.sin(t * 11) * 5 + Math.sin(t * 23) * 3;
    stones.crystal.rotation.y = t * 0.6;
    stones.crystal.position.y = 2.9 + Math.sin(t * 1.3) * 0.25;
    dock.boat.position.y = 0.38 + Math.sin(t * 1.1) * 0.06;
    dock.boat.rotation.z = Math.sin(t * 0.9) * 0.04;
  };

  return { group, update, tvScreen: cabin.screen };
}
