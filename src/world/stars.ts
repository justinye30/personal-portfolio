import * as THREE from 'three';
import { mulberry32 } from './noise';

const RADIUS = 1300;

// Shooting stars: a small pool of streaks, one every second or few, wherever the camera
// is looking (as long as that's sky).
const METEORS = 3;
const METEOR_RADIUS = RADIUS - 100;

interface Meteor {
  active: boolean;
  t: number;
  life: number;
  speed: number; // radians per second along the sky
  length: number; // trail length, radians
  start: THREE.Vector3;
  axis: THREE.Vector3; // rotating `start` about this moves it along the streak
  width: number; // world units across the head
}

// Twinkling stars. The group follows the camera like the sky dome;
// everything fades with `night` (0 → 1), which the World raises at the summit stop.
export function createStars(pixelRatio: () => number, opts: { reducedMotion: boolean }) {
  const group = new THREE.Group();
  group.name = 'stars';
  const rand = mulberry32(4242);

  const uniforms = {
    uTime: { value: 0 },
    uNight: { value: 0 },
    uPixel: { value: 1 },
  };

  // --- static stars
  const count = 1500;
  const pos = new Float32Array(count * 3);
  const seed = new Float32Array(count);
  const size = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const y = 0.06 + rand() * 0.94;
    const r = Math.sqrt(1 - y * y);
    const a = rand() * Math.PI * 2;
    pos.set([Math.cos(a) * r * RADIUS, y * RADIUS, Math.sin(a) * r * RADIUS], i * 3);
    seed[i] = rand();
    size[i] = rand() < 0.1 ? 4.5 + rand() * 2 : 2 + rand() * 1.8;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  const starMat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute float aSeed;
      attribute float aSize;
      uniform float uTime;
      uniform float uNight;
      uniform float uPixel;
      varying float vAlpha;
      void main() {
        vec3 dir = normalize(position);
        float tw = 0.55 + 0.45 * sin(uTime * (1.2 + aSeed * 3.0) + aSeed * 60.0);
        vAlpha = uNight * tw * smoothstep(0.05, 0.35, dir.y);
        gl_PointSize = aSize * uPixel * (0.8 + 0.4 * tw);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d) * vAlpha;
        if (a < 0.01) discard;
        gl_FragColor = vec4(vec3(1.0, 0.97, 0.92) * a, a);
      }
    `,
  });
  const stars = new THREE.Points(geo, starMat);
  stars.frustumCulled = false;
  stars.renderOrder = -5;
  group.add(stars);

  // --- shooting stars: thin ribbons, bright white at the head fading to a soft blue trail
  const mPos = new Float32Array(METEORS * 4 * 3);
  const mUv = new Float32Array(METEORS * 4 * 2);
  const mFade = new Float32Array(METEORS * 4);
  const mIndex: number[] = [];
  for (let i = 0; i < METEORS; i++) {
    // corners: (along, side); along 0 = tail, 1 = head
    mUv.set([0, -1, 0, 1, 1, -1, 1, 1], i * 8);
    const b = i * 4;
    mIndex.push(b, b + 2, b + 1, b + 1, b + 2, b + 3);
  }
  const mGeo = new THREE.BufferGeometry();
  const mPosAttr = new THREE.BufferAttribute(mPos, 3).setUsage(THREE.DynamicDrawUsage);
  const mFadeAttr = new THREE.BufferAttribute(mFade, 1).setUsage(THREE.DynamicDrawUsage);
  mGeo.setAttribute('position', mPosAttr);
  mGeo.setAttribute('aUv', new THREE.BufferAttribute(mUv, 2));
  mGeo.setAttribute('aFade', mFadeAttr);
  mGeo.setIndex(mIndex);
  const meteorMat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute vec2 aUv;
      attribute float aFade;
      varying vec2 vUv;
      varying float vFade;
      void main() {
        vUv = aUv;
        vFade = aFade;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uNight;
      varying vec2 vUv;
      varying float vFade;
      void main() {
        float along = vUv.x;
        float side = abs(vUv.y);
        // a hairline core with a soft glow around it
        float core = exp(-side * side * 40.0);
        float glow = exp(-side * side * 4.0) * 0.35;
        float trail = pow(along, 2.4);
        float head = smoothstep(0.8, 1.0, along);
        float a = (core + glow) * (trail + head * 0.8) * vFade * uNight;
        if (a < 0.003) discard;
        vec3 col = mix(vec3(0.55, 0.78, 1.0), vec3(1.0, 0.98, 0.95), head * core);
        gl_FragColor = vec4(col * a, a);
      }
    `,
  });
  const meteorMesh = new THREE.Mesh(mGeo, meteorMat);
  meteorMesh.frustumCulled = false;
  meteorMesh.renderOrder = -4;
  group.add(meteorMesh);

  const meteors: Meteor[] = Array.from({ length: METEORS }, () => ({
    active: false,
    t: 0,
    life: 1,
    speed: 1,
    length: 0.1,
    start: new THREE.Vector3(),
    axis: new THREE.Vector3(),
    width: 1,
  }));
  const mRand = mulberry32(777);
  let nextMeteor = 1.5;
  const fwd = new THREE.Vector3();
  const right = new THREE.Vector3();
  const upV = new THREE.Vector3();
  const travel = new THREE.Vector3();
  const head = new THREE.Vector3();
  const tail = new THREE.Vector3();

  const spawn = (camera: THREE.PerspectiveCamera, viewHeight: number) => {
    const m = meteors.find((x) => !x.active);
    if (!m) return;
    const q = camera.quaternion;
    fwd.set(0, 0, -1).applyQuaternion(q);
    right.set(1, 0, 0).applyQuaternion(q);
    upV.set(0, 1, 0).applyQuaternion(q);
    const ty = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    const tx = ty * camera.aspect;
    // start somewhere in the upper-left of the view, so the streak crosses it
    const sx = -0.75 + mRand() * 1.1;
    const sy = 0.15 + mRand() * 0.75;
    m.start.copy(fwd).addScaledVector(right, sx * tx).addScaledVector(upV, sy * ty).normalize();
    // only in the sky, comfortably above the ridgeline
    if (m.start.y < 0.32) return;
    // heading down and to the right on screen, 25-45 degrees below horizontal
    const tilt = 0.45 + mRand() * 0.35;
    travel.copy(right).multiplyScalar(Math.cos(tilt)).addScaledVector(upV, -Math.sin(tilt));
    travel.addScaledVector(m.start, -travel.dot(m.start)).normalize();
    m.axis.crossVectors(m.start, travel).normalize();
    const vfov = THREE.MathUtils.degToRad(camera.fov);
    m.speed = vfov * (0.42 + mRand() * 0.25);
    m.length = vfov * (0.18 + mRand() * 0.12);
    m.life = 0.65 + mRand() * 0.45;
    m.t = 0;
    // about 3 px wide at the head, whatever the screen size
    m.width = ((2 * METEOR_RADIUS * ty) / Math.max(viewHeight, 1)) * (2.6 + mRand() * 1.2);
    m.active = true;
  };

  const updateMeteors = (dt: number, night: number, camera: THREE.PerspectiveCamera, viewHeight: number) => {
    if (!opts.reducedMotion && night > 0.6) {
      nextMeteor -= dt;
      if (nextMeteor <= 0) {
        spawn(camera, viewHeight);
        nextMeteor = 1 + mRand() * 2;
      }
    }
    meteors.forEach((m, i) => {
      let fade = 0;
      if (m.active) {
        m.t += dt;
        if (m.t >= m.life) m.active = false;
        else {
          const k = m.t / m.life;
          fade = Math.min(1, m.t / 0.08) * (1 - THREE.MathUtils.smoothstep(k, 0.55, 1));
          const a = m.speed * m.t;
          head.copy(m.start).applyAxisAngle(m.axis, a).multiplyScalar(METEOR_RADIUS);
          tail.copy(m.start).applyAxisAngle(m.axis, Math.max(0, a - m.length)).multiplyScalar(METEOR_RADIUS);
        }
      }
      const b = i * 12;
      if (!fade) {
        mPos.fill(0, b, b + 12);
      } else {
        // the tail tapers; the head is full width
        const hw = m.width;
        const tw = m.width * 0.25;
        const ax = m.axis;
        mPos.set([tail.x - ax.x * tw, tail.y - ax.y * tw, tail.z - ax.z * tw], b);
        mPos.set([tail.x + ax.x * tw, tail.y + ax.y * tw, tail.z + ax.z * tw], b + 3);
        mPos.set([head.x - ax.x * hw, head.y - ax.y * hw, head.z - ax.z * hw], b + 6);
        mPos.set([head.x + ax.x * hw, head.y + ax.y * hw, head.z + ax.z * hw], b + 9);
      }
      mFade.fill(fade, i * 4, i * 4 + 4);
    });
    mPosAttr.needsUpdate = true;
    mFadeAttr.needsUpdate = true;
  };

  const update = (t: number, dt: number, night: number, camera: THREE.PerspectiveCamera, viewHeight: number) => {
    uniforms.uTime.value = t;
    uniforms.uNight.value = night;
    uniforms.uPixel.value = pixelRatio();
    stars.visible = night > 0.01;
    meteorMesh.visible = stars.visible;
    updateMeteors(dt, night, camera, viewHeight);
  };

  return { group, update };
}
