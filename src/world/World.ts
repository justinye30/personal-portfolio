import * as THREE from 'three';
import type { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { CAMP, FOREST_CLEARING, STONES, heightAt } from './layout';
import { createParticles } from './particles';
import { createProps } from './props';
import { CABIN_SHOT, CONTACT_SHOT, SHOTS, type Shot } from './shots';
import { SKY, createClouds, createDistantMountains, createSky } from './sky';
import { createStars } from './stars';
import { createTv } from './tv';
import { createOuterTerrain, createTerrain } from './terrain';
import { createVegetation } from './vegetation';
import { createWater } from './water';

export interface TravelCallbacks {
  onNear?: () => void;
  onArrive?: () => void;
}

interface Pose {
  pos: THREE.Vector3;
  target: THREE.Vector3;
  offset: THREE.Vector2;
  waypoints: THREE.Vector3[];
  night: number;
}

interface Travel {
  from: Pose;
  to: Pose;
  curve: THREE.CatmullRomCurve3;
  start: number;
  duration: number;
  // portions of the flight spent turning away from the start view / into the end view
  leaveSpan: number;
  arriveFrom: number;
  fromIndex: number;
  index: number;
  // the flight passes through the cabin doorway (keep the door open)
  door: boolean;
  near: boolean;
  cb: TravelCallbacks;
}

const REFLECTION_SCALE = 0.4;

// Sine in/out keeps peak speed low (~1.6x average) so long flights don't feel whippy.
const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const damp = (k: number, dt: number) => 1 - Math.exp(-k * dt);
const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

const UP = new THREE.Vector3(0, 1, 0);
// Spherical blend between two unit directions (handles near-opposite turns without flipping).
function slerpDir(out: THREE.Vector3, a: THREE.Vector3, b: THREE.Vector3, t: number) {
  const d = THREE.MathUtils.clamp(a.dot(b), -1, 1);
  if (d > 0.9995) return out.lerpVectors(a, b, t).normalize();
  if (d < -0.999) return out.copy(a).applyAxisAngle(UP, Math.PI * t);
  const theta = Math.acos(d);
  const sin = Math.sin(theta);
  const wa = Math.sin((1 - t) * theta) / sin;
  const wb = Math.sin(t * theta) / sin;
  const ax = a.x * wa + b.x * wb;
  const ay = a.y * wa + b.y * wb;
  const az = a.z * wa + b.z * wb;
  return out.set(ax, ay, az).normalize();
}

// Height a drone should cruise at over (x, z): comfortably above the terrain and tree tops.
function cruiseHeight(x: number, z: number) {
  let h = Math.max(heightAt(x, z), 0);
  for (const [dx, dz] of [[14, 0], [-14, 0], [0, 14], [0, -14]]) h = Math.max(h, heightAt(x + dx, z + dz));
  return h + 24;
}

// Heading convention: yaw 0 looks north (-z), positive yaw turns right (east).
const yawOf = (d: THREE.Vector3) => Math.atan2(d.x, -d.z);
const angleDiff = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

// The camera always faces up the valley like the home view, turning at most this far either
// way, and never swings around, even when flying back toward home.
const FRONT_YAW = yawOf(new THREE.Vector3().subVectors(new THREE.Vector3(...SHOTS[0].target), new THREE.Vector3(...SHOTS[0].pos)));
const MAX_TURN = THREE.MathUtils.degToRad(30);
const LEAN = THREE.MathUtils.degToRad(20);
const CRUISE_PITCH = -0.14;
// look-around mode can tilt this far up or down from level
const MAX_LOOK_PITCH = THREE.MathUtils.degToRad(75);

export class World {
  readonly renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private container: HTMLElement;
  private water: Reflector;
  private sky: THREE.Mesh;
  private clouds: THREE.Group;
  private updateProps: (t: number, doorOpen: number) => void;
  private stars: ReturnType<typeof createStars>;
  private tv: ReturnType<typeof createTv>;
  private doorOpen = 0;
  private night = 0;
  private smoothDir = new THREE.Vector3();
  private hasDir = false;
  private tmpA = new THREE.Vector3();
  private tmpB = new THREE.Vector3();
  private tmpC = new THREE.Vector3();
  private tmpDir = new THREE.Vector3();
  private timeUniform = { value: 0 };
  private particleUniforms = { uTime: this.timeUniform, uScale: { value: 500 } };
  private reducedMotion: boolean;

  private poses: Pose[] = [];
  private index: number;
  private introTarget: number;
  private current: Pose;
  private travel: Travel | null = null;
  private baseFov = 50;
  private pointer = new THREE.Vector2();
  private pointerSmooth = new THREE.Vector2();
  private last = performance.now() / 1000;
  private readyFired = false;
  private onReady: () => void;
  private perf = { frames: 0, time: 0, skip: 2 };
  // look-around mode: heading offsets from the parked view, eased back to zero on exit
  private looking = false;
  private lookBlend = 0;
  private lookYaw = 0;
  private lookPitch = 0;

  private tmpPos = new THREE.Vector3();
  private tmpLook = new THREE.Vector3();
  private tmpOff = new THREE.Vector2();
  private tmpRight = new THREE.Vector3();
  private tmpUp = new THREE.Vector3();
  private lastLook = new THREE.Vector3();

  constructor(container: HTMLElement, startIndex: number, opts: { reducedMotion: boolean; onReady: () => void }) {
    this.container = container;
    // open at the summit (matching the loading screen's sky), then fly to the requested stop
    this.index = CONTACT_SHOT;
    this.introTarget = startIndex;
    this.reducedMotion = opts.reducedMotion;
    this.onReady = opts.onReady;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.domElement.className = 'world-canvas';
    container.appendChild(renderer.domElement);
    this.renderer = renderer;

    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(50, w / h, 0.5, 4000);
    this.camera.layers.enable(1);

    const scene = this.scene;
    scene.background = SKY.horizon.clone();
    scene.fog = new THREE.Fog(SKY.fog, 110, 560);

    // lighting: warm low sun + lavender sky fill
    const hemi = new THREE.HemisphereLight('#e2d2f5', '#8a9a55', 1.7);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight('#ffd6ad', 2.6);
    sun.position.set(-250, 150, -170);
    sun.target.position.set(0, 0, -10);
    sun.castShadow = true;
    const isSmall = Math.min(w, h) < 700;
    sun.shadow.mapSize.set(isSmall ? 2048 : 4096, isSmall ? 2048 : 4096);
    const sc = sun.shadow.camera;
    sc.left = -200;
    sc.right = 200;
    sc.top = 200;
    sc.bottom = -200;
    sc.near = 10;
    sc.far = 800;
    sun.shadow.bias = -0.0008;
    sun.shadow.normalBias = 0.6;
    scene.add(sun, sun.target);

    this.sky = createSky();
    scene.add(this.sky);
    scene.add(createDistantMountains());
    this.clouds = createClouds();
    scene.add(this.clouds);
    scene.add(createTerrain(), createOuterTerrain());

    const dpr = renderer.getPixelRatio();
    this.water = createWater(Math.round(w * dpr * REFLECTION_SCALE), Math.round(h * dpr * REFLECTION_SCALE));
    scene.add(this.water);
    // keep grass & particles out of the (half-res) reflection pass
    const reflectionCam = (this.water as unknown as { getReflectionCamera(c: THREE.Camera): THREE.Camera }).getReflectionCamera(this.camera);
    reflectionCam.layers.disable(1);

    this.stars = createStars(() => this.renderer.getPixelRatio());
    scene.add(this.stars.group);

    scene.add(createVegetation(this.timeUniform));
    const props = createProps();
    scene.add(props.group);
    this.updateProps = props.update;
    this.tv = createTv(props.tvScreen);

    const pu = this.particleUniforms;
    scene.add(
      createParticles(
        { count: 700, center: [0, 0], radius: 170, height: [2, 34], colors: ['#ffe3f0', '#f6c2dc', '#ffffff', '#e7cfff'], size: 0.45, seed: 1, drift: 3, followGround: true },
        pu,
      ),
      createParticles(
        { count: 90, center: [FOREST_CLEARING.x, FOREST_CLEARING.z], radius: 22, height: [0.8, 7], colors: ['#ffe9a3', '#fff3c4'], size: 0.32, seed: 2, drift: 1.6, blink: true, additive: true, followGround: true },
        pu,
      ),
      createParticles(
        { count: 70, center: [STONES.x, STONES.z], radius: 11, height: [0.8, 7], colors: ['#e3c8ff', '#c8a2ff', '#ffffff'], size: 0.3, seed: 3, drift: 1.3, blink: true, additive: true, followGround: true },
        pu,
      ),
      createParticles(
        { count: 60, center: [CAMP.x, CAMP.z], radius: 0.8, height: [1, 9], colors: ['#ffb36b', '#ff8c42', '#ffe08a'], size: 0.18, seed: 4, rise: 1.6, drift: 0.5, additive: true, followGround: true },
        pu,
      ),
    );

    this.computePoses();
    this.current = this.poses[CONTACT_SHOT];
    this.night = this.current.night;
    this.resize();

    window.addEventListener('resize', this.resize);
    window.addEventListener('pointermove', this.onPointer, { passive: true });
  }

  /** Compile shaders off the main thread where supported, then start rendering. */
  async start() {
    try {
      await this.renderer.compileAsync(this.scene, this.camera);
    } catch {
      // fall back to compiling on first render
    }
    this.last = performance.now() / 1000;
    this.renderer.setAnimationLoop(this.frame);
  }

  // Drop resolution on slower GPUs so travel stays smooth.
  private adaptQuality(dt: number) {
    const p = this.perf;
    p.frames++;
    p.time += dt;
    if (p.time < 1.5) return;
    const fps = p.frames / p.time;
    p.frames = 0;
    p.time = 0;
    if (p.skip > 0) {
      p.skip--;
      return;
    }
    const pr = this.renderer.getPixelRatio();
    if ((fps < 42 && pr > 1) || (fps < 30 && pr > 0.75)) {
      this.renderer.setPixelRatio(Math.max(0.75, pr - 0.25));
      this.resize();
    }
  }

  get isPortrait() {
    return this.camera.aspect < 0.85;
  }

  private computePoses() {
    const portrait = this.isPortrait;
    this.poses = SHOTS.map((s: Shot) => {
      const src = portrait && s.portrait ? s.portrait : s;
      const pos = new THREE.Vector3(...src.pos);
      const target = new THREE.Vector3(...src.target);
      if (portrait && !s.portrait && !s.waypoints) {
        pos.sub(target).multiplyScalar(1.2).add(target);
        pos.y = Math.max(pos.y, heightAt(pos.x, pos.z) + 2.5);
      }
      const off = portrait ? s.mobileOffset : s.offset;
      return {
        pos,
        target,
        offset: new THREE.Vector2(off[0], off[1]),
        waypoints: (s.waypoints ?? []).map((w) => new THREE.Vector3(...w)),
        night: s.night ? 1 : 0,
      };
    });
  }

  private resize = () => {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    const wasPortrait = this.isPortrait;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.baseFov = this.isPortrait ? 64 : w / h < 1.3 ? 56 : 50;
    const dpr = this.renderer.getPixelRatio();
    this.water.getRenderTarget().setSize(Math.round(w * dpr * REFLECTION_SCALE), Math.round(h * dpr * REFLECTION_SCALE));
    this.particleUniforms.uScale.value = (h * dpr) / (2 * Math.tan(THREE.MathUtils.degToRad(this.baseFov / 2)));
    if (this.poses.length && wasPortrait !== this.isPortrait) {
      this.computePoses();
      if (!this.travel && this.readyFired) this.current = this.poses[this.index];
    }
  };

  private onPointer = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return;
    this.pointer.set((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
  };

  /** Fly from the summit to the first stop, exactly like a normal trip from Contact.
   *  Returns immediately; callbacks fire as the camera lands. */
  intro(cb: TravelCallbacks) {
    if (this.introTarget === this.index) {
      cb.onNear?.();
      cb.onArrive?.();
      return;
    }
    this.startTravel(this.introTarget, cb, this.reducedMotion ? 0 : undefined);
  }

  goTo(index: number, cb: TravelCallbacks = {}) {
    if (index === this.index && !this.travel) {
      cb.onNear?.();
      cb.onArrive?.();
      return;
    }
    this.startTravel(index, cb, this.reducedMotion ? 0 : undefined);
  }

  /** Free the camera to turn in place (or ease it back to the framed view). */
  setLookAround(on: boolean) {
    this.looking = on && !this.travel;
  }

  /** Turn the view by a drag of (dx, dy) pixels, grabbing the scene like a 360° photo. */
  lookBy(dx: number, dy: number) {
    if (!this.looking) return;
    const h = this.renderer.domElement.clientHeight || window.innerHeight;
    const k = THREE.MathUtils.degToRad(this.camera.fov) / h;
    const base = Math.asin(THREE.MathUtils.clamp(this.tmpA.subVectors(this.current.target, this.current.pos).normalize().y, -1, 1));
    this.lookYaw = angleDiff(this.lookYaw - dx * k, 0);
    this.lookPitch = THREE.MathUtils.clamp(this.lookPitch + dy * k, -MAX_LOOK_PITCH - base, MAX_LOOK_PITCH - base);
  }

  /** Tune the cabin TV to a project (or back to the idle screen with null). */
  showProject(index: number | null) {
    this.tv.show(index);
  }

  private snapshotPose(): Pose {
    return {
      pos: this.camera.position.clone(),
      target: this.lastLook.clone(),
      offset: this.tmpOff.clone(),
      waypoints: [],
      night: this.night,
    };
  }

  private startTravel(index: number, cb: TravelCallbacks, duration: number | undefined) {
    const interrupted = this.travel !== null;
    const from = interrupted ? this.snapshotPose() : this.current;
    const fromIndex = this.index;
    const to = this.poses[index];
    this.index = index;
    this.looking = false;
    this.lookYaw = 0;
    this.lookPitch = 0;
    if (fromIndex === CABIN_SHOT && index !== CABIN_SHOT) this.tv.show(null);

    if (duration === 0) {
      this.travel = null;
      this.current = to;
      cb.onNear?.();
      cb.onArrive?.();
      return;
    }

    // Flight plan, drone-style: back out through any doorway, cruise above the treetops
    // (only climbing when the ground demands it), then thread the destination's doorway.
    // Redirected mid-flight, the camera backs out of whatever doorway it is in and skips
    // the approach points it has already passed.
    const exit = interrupted ? this.doorwayExit(from.pos, to) : [...from.waypoints].reverse();
    const toGo = from.pos.distanceTo(to.pos);
    const approach = interrupted ? to.waypoints.filter((w) => w.distanceTo(to.pos) < toGo - 0.5) : to.waypoints;
    const head = [from.pos, ...exit].map((p) => p.clone());
    const tail = [...approach, to.pos].map((p) => p.clone());

    const a = head[head.length - 1];
    const b = tail[0];
    const cruise: THREE.Vector3[] = [];
    const span = Math.hypot(b.x - a.x, b.z - a.z);
    if (span > 30) {
      for (const f of [1 / 3, 2 / 3]) {
        const p = a.clone().lerp(b, f);
        p.y = Math.max(p.y, cruiseHeight(p.x, p.z));
        cruise.push(p);
      }
    }
    const build = () => {
      const pts: THREE.Vector3[] = [];
      for (const p of [...head, ...cruise, ...tail]) {
        if (!pts.length || pts[pts.length - 1].distanceTo(p) > 0.5) pts.push(p);
      }
      if (pts.length < 2) pts.push(to.pos.clone().add(new THREE.Vector3(0, 0.01, 0)));
      return new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    };
    let curve = build();
    // the spline can sag between cruise points; lift them until the whole flight clears the ground
    for (let iter = 0; iter < 3 && cruise.length; iter++) {
      let deficit = 0;
      for (let i = 1; i < 40; i++) {
        const q = curve.getPointAt(i / 40, this.tmpA);
        const nearFixed = [...head, ...tail].some((f) => Math.hypot(f.x - q.x, f.z - q.z) < 14);
        if (nearFixed) continue;
        deficit = Math.max(deficit, heightAt(q.x, q.z) + 8 - q.y);
      }
      if (deficit <= 0) break;
      cruise.forEach((c) => (c.y += deficit + 3));
      curve = build();
    }
    const length = curve.getLength();

    this.travel = {
      from,
      to,
      curve,
      start: performance.now() / 1000,
      duration:
        duration ??
        THREE.MathUtils.clamp(2.3 + length / 240, 2.6, 4.4) + (approach.length ? 0.8 : 0) + (exit.length ? 0.5 : 0),
      leaveSpan: exit.length ? 0.25 : 0.35,
      arriveFrom: approach.length ? 0.7 : to.night ? 0.62 : 0.55,
      fromIndex,
      index,
      door: index === CABIN_SHOT || fromIndex === CABIN_SHOT || exit.length > 0,
      near: false,
      cb,
    };
  }

  /** Waypoints leading back out of any doorway the camera at `p` is inside or lined up on
   *  (nearest first), unless that doorway belongs to the destination. */
  private doorwayExit(p: THREE.Vector3, to: Pose) {
    for (const pose of this.poses) {
      if (pose === to || !pose.waypoints.length) continue;
      const d = p.distanceTo(pose.pos);
      // beyond the outermost approach point: already clear of this doorway
      if (d >= pose.waypoints[0].distanceTo(pose.pos)) continue;
      return pose.waypoints.filter((w) => w.distanceTo(pose.pos) > d + 0.5).reverse().map((w) => w.clone());
    }
    return [];
  }

  private frame = () => {
    const now = performance.now() / 1000;
    // animations use a capped step; smoothing uses real elapsed time so a slow frame
    // never leaves the camera lagging behind its target
    const realDt = Math.min(now - this.last, 1);
    const dt = Math.min(realDt, 0.1);
    this.last = now;
    this.timeUniform.value += dt;
    const t = this.timeUniform.value;

    // door opens for any trip into or out of the cabin, and stays open while we're inside
    const tr0 = this.travel;
    const doorTarget = tr0 ? (tr0.door ? 1 : 0) : this.index === CABIN_SHOT ? 1 : 0;
    this.doorOpen += (doorTarget - this.doorOpen) * damp(4, realDt);
    this.updateProps(t, easeInOutCubic(this.doorOpen));
    this.tv.update(t, dt);
    this.clouds.rotation.y += dt * 0.003;
    (this.water.material as THREE.ShaderMaterial).uniforms.uTime.value = t;

    this.pointerSmooth.lerp(this.pointer, 1 - Math.exp(-dt * 2.5));

    this.lookBlend += ((this.looking ? 1 : 0) - this.lookBlend) * damp(4, realDt);
    if (!this.looking && (this.lookYaw || this.lookPitch)) {
      const keep = 1 - damp(3, realDt);
      this.lookYaw *= keep;
      this.lookPitch *= keep;
      if (Math.abs(this.lookYaw) + Math.abs(this.lookPitch) < 1e-4) this.lookYaw = this.lookPitch = 0;
    }

    const cam = this.camera;
    const pos = this.tmpPos;
    const look = this.tmpLook;
    let fov = this.baseFov;
    let idle = 1;
    let lookDist: number;
    const dir = this.tmpDir;

    const tr = this.travel;
    if (tr) {
      const raw = clamp01((now - tr.start) / tr.duration);
      const e = easeInOutSine(raw);
      tr.curve.getPointAt(e, pos);

      const startDir = this.tmpA.subVectors(tr.from.target, tr.from.pos).normalize();
      const endDir = this.tmpB.subVectors(tr.to.target, tr.to.pos).normalize();
      const sYaw = yawOf(startDir);
      const eYaw = yawOf(endDir);
      const sPitch = Math.asin(THREE.MathUtils.clamp(startDir.y, -1, 1));
      const ePitch = Math.asin(THREE.MathUtils.clamp(endDir.y, -1, 1));
      let yaw = sYaw + angleDiff(eYaw, sYaw) * easeInOutSine(raw);
      // settle into a gentle downward cruise tilt that shows the landscape, then into the
      // destination's view as we arrive
      const leave = smoothstep(0, tr.leaveSpan, raw);
      const arrive = smoothstep(tr.arriveFrom, 1, raw);
      const pitch = THREE.MathUtils.lerp(THREE.MathUtils.lerp(sPitch, CRUISE_PITCH, leave), ePitch, arrive);
      // lean a little toward the side we're travelling (a drone strafing, not turning around)
      const ahead = tr.curve.getPointAt(Math.min(1, e + 0.06), this.tmpC).sub(pos);
      const flat = Math.hypot(ahead.x, ahead.z);
      if (flat > 0.5) {
        const lateral = Math.sin(angleDiff(Math.atan2(ahead.x, -ahead.z), FRONT_YAW));
        yaw += lateral * LEAN * Math.sin(Math.PI * raw);
      }
      yaw = FRONT_YAW + THREE.MathUtils.clamp(angleDiff(yaw, FRONT_YAW), -MAX_TURN, MAX_TURN);
      const cp = Math.cos(pitch);
      dir.set(Math.sin(yaw) * cp, Math.sin(pitch), -Math.cos(yaw) * cp);
      const dA = tr.from.target.distanceTo(tr.from.pos);
      const dB = tr.to.target.distanceTo(tr.to.pos);
      lookDist = THREE.MathUtils.lerp(dA, dB, e);

      fov += Math.pow(Math.sin(Math.PI * raw), 2) * 4;
      this.tmpOff.lerpVectors(tr.from.offset, tr.to.offset, e);
      this.night = THREE.MathUtils.lerp(tr.from.night, tr.to.night, easeInOutSine(clamp01(raw * 1.3 - 0.15)));
      idle = raw;

      const floor = heightAt(pos.x, pos.z) + 2.2;
      if (pos.y < floor) pos.y = floor;

      if (!tr.near && raw >= 0.8) {
        tr.near = true;
        tr.cb.onNear?.();
      }
      if (raw >= 1) {
        this.current = tr.to;
        this.travel = null;
        tr.cb.onArrive?.();
      }
    } else {
      pos.copy(this.current.pos);
      dir.subVectors(this.current.target, this.current.pos);
      lookDist = dir.length();
      dir.normalize();
      if (this.lookYaw || this.lookPitch) {
        const yaw = yawOf(dir) + this.lookYaw;
        const pitch = THREE.MathUtils.clamp(Math.asin(THREE.MathUtils.clamp(dir.y, -1, 1)) + this.lookPitch, -MAX_LOOK_PITCH, MAX_LOOK_PITCH);
        const cp = Math.cos(pitch);
        dir.set(Math.sin(yaw) * cp, Math.sin(pitch), -Math.cos(yaw) * cp);
      }
      // centre the projection while looking around; the text it made room for is hidden
      this.tmpOff.copy(this.current.offset).multiplyScalar(1 - this.lookBlend);
    }

    // gentle hover + pointer parallax
    const sway = Math.min(lookDist * 0.01, 0.9) * idle;
    pos.x += Math.sin(t * 0.21) * sway;
    pos.y += Math.sin(t * 0.33) * sway * 0.5;
    pos.z += Math.cos(t * 0.17) * sway * 0.6;
    // ease the heading itself (not a look-at point) so the view never snaps or lags sideways
    if (!this.hasDir) {
      this.smoothDir.copy(dir);
      this.hasDir = true;
    }
    slerpDir(this.smoothDir, this.smoothDir.clone(), dir, damp(tr ? 3.5 : 6, realDt));
    look.copy(pos).addScaledVector(this.smoothDir, lookDist);
    cam.position.copy(pos);
    cam.lookAt(look);
    this.lastLook.copy(look);
    const par = lookDist * 0.035 * idle * (1 - this.lookBlend);
    const right = this.tmpRight.set(1, 0, 0).applyQuaternion(cam.quaternion);
    const up = this.tmpUp.set(0, 1, 0).applyQuaternion(cam.quaternion);
    look.addScaledVector(right, this.pointerSmooth.x * par).addScaledVector(up, -this.pointerSmooth.y * par * 0.5);
    cam.lookAt(look);

    const w = this.renderer.domElement.clientWidth;
    const h = this.renderer.domElement.clientHeight;
    cam.fov = fov;
    cam.setViewOffset(w, h, this.tmpOff.x * w, this.tmpOff.y * h, w, h);
    cam.updateProjectionMatrix();

    this.sky.position.copy(cam.position);
    this.stars.group.position.copy(cam.position);
    (this.sky.material as THREE.ShaderMaterial).uniforms.uNight.value = this.night;
    this.stars.update(t, this.night);
    this.renderer.render(this.scene, cam);
    if (this.readyFired) this.adaptQuality(dt);

    if (!this.readyFired) {
      this.readyFired = true;
      this.onReady();
    }
  };

  dispose() {
    this.renderer.setAnimationLoop(null);
    window.removeEventListener('resize', this.resize);
    window.removeEventListener('pointermove', this.onPointer);
    this.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat?.dispose();
    });
    this.water.dispose();
    this.tv.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
