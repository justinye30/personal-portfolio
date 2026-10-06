import * as THREE from 'three';
import type { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { CAMP, FOREST_CLEARING, STONES, heightAt } from './layout';
import { createParticles } from './particles';
import { createProps } from './props';
import { SHOTS, type Shot } from './shots';
import { SKY, createClouds, createDistantMountains, createSky } from './sky';
import { createTerrain } from './terrain';
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
}

interface Travel {
  from: Pose;
  to: Pose;
  c1: THREE.Vector3;
  c2: THREE.Vector3;
  start: number;
  duration: number;
  roll: number;
  isIntro: boolean;
  index: number;
  near: boolean;
  cb: TravelCallbacks;
}

const REFLECTION_SCALE = 0.4;

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

function bezier(out: THREE.Vector3, p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3, t: number) {
  const u = 1 - t;
  return out
    .copy(p0)
    .multiplyScalar(u * u * u)
    .addScaledVector(p1, 3 * u * u * t)
    .addScaledVector(p2, 3 * u * t * t)
    .addScaledVector(p3, t * t * t);
}

function bezierTangent(out: THREE.Vector3, p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3, t: number) {
  const u = 1 - t;
  return out
    .copy(p1)
    .sub(p0)
    .multiplyScalar(3 * u * u)
    .addScaledVector(new THREE.Vector3().subVectors(p2, p1), 6 * u * t)
    .addScaledVector(new THREE.Vector3().subVectors(p3, p2), 3 * t * t);
}

export class World {
  readonly renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private container: HTMLElement;
  private water: Reflector;
  private sky: THREE.Mesh;
  private clouds: THREE.Group;
  private updateProps: (t: number) => void;
  private timeUniform = { value: 0 };
  private particleUniforms = { uTime: this.timeUniform, uScale: { value: 500 } };
  private reducedMotion: boolean;

  private poses: Pose[] = [];
  private index: number;
  private current: Pose;
  private travel: Travel | null = null;
  private baseFov = 50;
  private pointer = new THREE.Vector2();
  private pointerSmooth = new THREE.Vector2();
  private last = performance.now() / 1000;
  private readyFired = false;
  private onReady: () => void;
  private perf = { frames: 0, time: 0, skip: 2 };

  private tmpPos = new THREE.Vector3();
  private tmpLook = new THREE.Vector3();
  private tmpTan = new THREE.Vector3();
  private tmpOff = new THREE.Vector2();
  private tmpFwd = new THREE.Vector3();
  private tmpRight = new THREE.Vector3();
  private tmpUp = new THREE.Vector3();
  private lastLook = new THREE.Vector3();

  constructor(container: HTMLElement, startIndex: number, opts: { reducedMotion: boolean; onReady: () => void }) {
    this.container = container;
    this.index = startIndex;
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
    scene.add(createTerrain());

    const dpr = renderer.getPixelRatio();
    this.water = createWater(Math.round(w * dpr * REFLECTION_SCALE), Math.round(h * dpr * REFLECTION_SCALE));
    scene.add(this.water);
    // keep grass & particles out of the (half-res) reflection pass
    const reflectionCam = (this.water as unknown as { getReflectionCamera(c: THREE.Camera): THREE.Camera }).getReflectionCamera(this.camera);
    reflectionCam.layers.disable(1);

    scene.add(createVegetation(this.timeUniform));
    const props = createProps();
    scene.add(props.group);
    this.updateProps = props.update;

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
    const startPose = this.poses[startIndex];
    // intro: begin high above the valley and swoop down into the first stop
    const intro: Pose = {
      pos: startPose.pos.clone().add(new THREE.Vector3(30, 90, 110)),
      target: startPose.target.clone().add(new THREE.Vector3(0, 40, 0)),
      offset: startPose.offset.clone(),
    };
    this.current = intro;
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
      const pos = new THREE.Vector3(...s.pos);
      const target = new THREE.Vector3(...s.target);
      if (portrait) {
        pos.sub(target).multiplyScalar(1.2).add(target);
        pos.y = Math.max(pos.y, heightAt(pos.x, pos.z) + 2.5);
      }
      const off = portrait ? s.mobileOffset : s.offset;
      return { pos, target, offset: new THREE.Vector2(off[0], off[1]) };
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

  /** Start the opening swoop. Returns immediately; callbacks fire as the camera lands. */
  intro(cb: TravelCallbacks) {
    this.startTravel(this.index, cb, this.reducedMotion ? 0 : 3.2, true);
  }

  goTo(index: number, cb: TravelCallbacks = {}) {
    if (index === this.index && !this.travel) {
      cb.onNear?.();
      cb.onArrive?.();
      return;
    }
    this.startTravel(index, cb, this.reducedMotion ? 0 : undefined, false);
  }

  private snapshotPose(): Pose {
    return {
      pos: this.camera.position.clone(),
      target: this.lastLook.clone(),
      offset: this.tmpOff.clone(),
    };
  }

  private startTravel(index: number, cb: TravelCallbacks, duration: number | undefined, isIntro: boolean) {
    const from = isIntro ? this.current : this.travel ? this.snapshotPose() : this.current;
    const to = this.poses[index];
    this.index = index;

    if (duration === 0) {
      this.travel = null;
      this.current = to;
      cb.onNear?.();
      cb.onArrive?.();
      return;
    }

    const d = from.pos.distanceTo(to.pos);
    const dir = new THREE.Vector3().subVectors(to.pos, from.pos);
    const lift = isIntro ? 0 : 8 + d * 0.2;
    const c1 = from.pos.clone().addScaledVector(dir, 0.28);
    c1.y = Math.max(c1.y, from.pos.y) + lift;
    const c2 = from.pos.clone().addScaledVector(dir, 0.72);
    c2.y = Math.max(c2.y, to.pos.y) + lift * 0.75;

    // bank into the turn
    const fromFwd = new THREE.Vector3().subVectors(from.target, from.pos).setY(0).normalize();
    const toFwd = new THREE.Vector3().subVectors(to.target, to.pos).setY(0).normalize();
    const turn = fromFwd.x * toFwd.z - fromFwd.z * toFwd.x;

    this.travel = {
      from,
      to,
      c1,
      c2,
      start: performance.now() / 1000,
      duration: duration ?? THREE.MathUtils.clamp(1.25 + d / 380, 1.4, 2.1),
      roll: isIntro ? 0 : THREE.MathUtils.clamp(turn, -1, 1) * 0.09,
      isIntro,
      index,
      near: false,
      cb,
    };
  }

  private frame = () => {
    const now = performance.now() / 1000;
    const dt = Math.min(now - this.last, 0.1);
    this.last = now;
    this.timeUniform.value += dt;
    const t = this.timeUniform.value;

    this.updateProps(t);
    this.clouds.rotation.y += dt * 0.003;
    (this.water.material as THREE.ShaderMaterial).uniforms.uTime.value = t;

    this.pointerSmooth.lerp(this.pointer, 1 - Math.exp(-dt * 2.5));

    const cam = this.camera;
    const pos = this.tmpPos;
    const look = this.tmpLook;
    let fov = this.baseFov;
    let roll = 0;
    let idle = 1;

    const tr = this.travel;
    if (tr) {
      const raw = clamp01((now - tr.start) / tr.duration);
      const e = tr.isIntro ? easeOutCubic(raw) : easeInOutCubic(raw);
      bezier(pos, tr.from.pos, tr.c1, tr.c2, tr.to.pos, e);
      const lookT = easeInOutCubic(clamp01(raw * 1.15 - 0.05));
      look.lerpVectors(tr.from.target, tr.to.target, lookT);
      // mid-flight, look where we're flying
      bezierTangent(this.tmpTan, tr.from.pos, tr.c1, tr.c2, tr.to.pos, e);
      if (this.tmpTan.lengthSq() > 1e-6) {
        this.tmpTan.normalize();
        this.tmpTan.y = Math.min(this.tmpTan.y, 0.05);
        const fwd = this.tmpFwd.copy(pos).addScaledVector(this.tmpTan, 60);
        const w = tr.isIntro ? 0 : Math.pow(Math.sin(Math.PI * raw), 2) * 0.55;
        look.lerp(fwd, w);
      }
      const pulse = Math.pow(Math.sin(Math.PI * raw), 2);
      fov += pulse * (tr.isIntro ? 4 : 14);
      roll = Math.sin(Math.PI * raw) * tr.roll;
      this.tmpOff.lerpVectors(tr.from.offset, tr.to.offset, e);
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
      look.copy(this.current.target);
      this.tmpOff.copy(this.current.offset);
    }

    // gentle hover + pointer parallax
    const dist = pos.distanceTo(look);
    const sway = Math.min(dist * 0.01, 0.9) * idle;
    pos.x += Math.sin(t * 0.21) * sway;
    pos.y += Math.sin(t * 0.33) * sway * 0.5;
    pos.z += Math.cos(t * 0.17) * sway * 0.6;
    cam.position.copy(pos);
    cam.lookAt(look);
    this.lastLook.copy(look);
    const par = dist * 0.035 * idle;
    const right = this.tmpRight.set(1, 0, 0).applyQuaternion(cam.quaternion);
    const up = this.tmpUp.set(0, 1, 0).applyQuaternion(cam.quaternion);
    look.addScaledVector(right, this.pointerSmooth.x * par).addScaledVector(up, -this.pointerSmooth.y * par * 0.5);
    cam.lookAt(look);
    if (roll) cam.rotateZ(roll);

    const w = this.renderer.domElement.clientWidth;
    const h = this.renderer.domElement.clientHeight;
    cam.fov = fov;
    cam.setViewOffset(w, h, this.tmpOff.x * w, this.tmpOff.y * h, w, h);
    cam.updateProjectionMatrix();

    this.sky.position.copy(cam.position);
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
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
