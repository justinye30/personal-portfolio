import * as THREE from 'three';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { LAKE, WATER_LEVEL } from './layout';
import { mulberry32 } from './noise';
import { SKY, SUN_DIR } from './sky';

const WaterShader = {
  name: 'LowPolyWater',
  uniforms: THREE.UniformsUtils.merge([
    THREE.UniformsLib.fog,
    {
      color: { value: null },
      tDiffuse: { value: null },
      textureMatrix: { value: null },
      uTime: { value: 0 },
      uDeep: { value: new THREE.Color('#5d8fb0') },
      uShallow: { value: new THREE.Color('#8fc4c9') },
      uSky: { value: SKY.mid.clone() },
      uSunDir: { value: SUN_DIR.clone() },
      uSunColor: { value: new THREE.Color('#fff0d0') },
    },
  ]),
  vertexShader: /* glsl */ `
    uniform mat4 textureMatrix;
    uniform float uTime;
    varying vec4 vUv;
    varying vec3 vWorld;
    #include <fog_pars_vertex>
    void main() {
      vUv = textureMatrix * vec4(position, 1.0);
      vec4 wp = modelMatrix * vec4(position, 1.0);
      float w = sin(wp.x * 0.31 + wp.z * 0.17 + uTime * 0.9) * 0.05
              + sin(wp.z * 0.43 - wp.x * 0.23 - uTime * 1.1) * 0.05
              + sin(wp.x * 0.83 - wp.z * 0.61 + uTime * 1.6) * 0.025
              + sin(wp.z * 1.13 + wp.x * 0.97 - uTime * 1.9) * 0.02;
      wp.y += w;
      vWorld = wp.xyz;
      vec4 mvPosition = viewMatrix * wp;
      gl_Position = projectionMatrix * mvPosition;
      #include <fog_vertex>
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform vec3 uDeep;
    uniform vec3 uShallow;
    uniform vec3 uSky;
    uniform vec3 uSunDir;
    uniform vec3 uSunColor;
    varying vec4 vUv;
    varying vec3 vWorld;
    #include <fog_pars_fragment>
    void main() {
      // faceted normal from screen-space derivatives gives the low-poly look
      vec3 n = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
      if (n.y < 0.0) n = -n;
      vec3 viewDir = normalize(cameraPosition - vWorld);
      float fres = pow(1.0 - max(dot(n, viewDir), 0.0), 2.5);

      vec4 uv = vUv;
      uv.xy += n.xz * 2.2 * uv.w * 0.02;
      vec3 refl = texture2DProj(tDiffuse, uv).rgb;

      vec3 base = mix(uDeep, uShallow, clamp(0.45 + (n.x + n.z) * 6.0, 0.0, 1.0));
      vec3 col = mix(base, refl, 0.45 + 0.4 * fres);
      col = mix(col, uSky, 0.08);

      float spec = pow(max(dot(reflect(-uSunDir, n), viewDir), 0.0), 120.0);
      col += uSunColor * spec * 0.9;

      gl_FragColor = vec4(col, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      #include <fog_fragment>
    }
  `,
};

export function createWater(textureWidth: number, textureHeight: number) {
  const width = LAKE.rx * 2.9;
  const depth = LAKE.rz * 3.1;
  const geo = new THREE.PlaneGeometry(width, depth, 72, 48);
  // irregular facets instead of a visible grid
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const rand = mulberry32(31);
  const sx = (width / 72) * 0.45;
  const sy = (depth / 48) * 0.45;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    if (Math.abs(x) < width / 2 - 0.01) pos.setX(i, x + (rand() - 0.5) * sx);
    if (Math.abs(y) < depth / 2 - 0.01) pos.setY(i, y + (rand() - 0.5) * sy);
  }
  const water = new Reflector(geo, {
    shader: WaterShader,
    textureWidth,
    textureHeight,
    color: '#7f7f7f',
    clipBias: 0.003,
    multisample: 0,
  });
  water.rotation.x = -Math.PI / 2;
  water.position.set(LAKE.x, WATER_LEVEL, LAKE.z);
  const mat = water.material as THREE.ShaderMaterial;
  mat.fog = true;
  water.name = 'water';
  return water;
}
