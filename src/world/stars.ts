import * as THREE from 'three';
import { mulberry32 } from './noise';

const RADIUS = 1300;

// Twinkling stars. The group follows the camera like the sky dome;
// everything fades with `night` (0 → 1), which the World raises at the summit stop.
export function createStars(pixelRatio: () => number) {
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

  const update = (t: number, night: number) => {
    uniforms.uTime.value = t;
    uniforms.uNight.value = night;
    uniforms.uPixel.value = pixelRatio();
    stars.visible = night > 0.01;
  };

  return { group, update };
}
