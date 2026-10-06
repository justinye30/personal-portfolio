import * as THREE from 'three';
import { projectData } from '../content';

const PIXEL_FONT = '"Pixelify Sans", "JetBrains Mono", monospace';

// CRT look: slight barrel distortion, scanlines, vignette, and a burst of static on channel change.
function crtMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      map: { value: null as THREE.Texture | null },
      uTime: { value: 0 },
      uStatic: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D map;
      uniform float uTime;
      uniform float uStatic;
      varying vec2 vUv;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main() {
        vec2 c = vUv - 0.5;
        vec2 uv = 0.5 + c * (1.0 + 0.09 * dot(c, c) * 4.0);
        vec3 col = texture2D(map, uv).rgb;
        if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) col = vec3(0.0);
        float n = hash(floor(uv * vec2(320.0, 240.0)) + floor(uTime * 30.0));
        col = mix(col, vec3(n), uStatic);
        col *= 0.86 + 0.14 * sin(uv.y * 720.0 + uTime * 4.0);
        col *= smoothstep(0.78, 0.32, length(c * vec2(1.0, 1.15)));
        col += vec3(0.015, 0.025, 0.03);
        gl_FragColor = vec4(col * 1.12, 1.0);
        #include <colorspace_fragment>
      }
    `,
  });
}

function drawIdle(ctx: CanvasRenderingContext2D) {
  const { width: w, height: h } = ctx.canvas;
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#1d3b45');
  g.addColorStop(1, '#0f2229');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#9fe0d0';
  ctx.font = `700 ${Math.round(h * 0.07)}px ${PIXEL_FONT}`;
  ctx.textBaseline = 'top';
  ctx.fillText('CH 03', w * 0.06, h * 0.07);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#e8fff6';
  ctx.font = `700 ${Math.round(h * 0.13)}px ${PIXEL_FONT}`;
  ctx.fillText('PROJECTS', w / 2, h * 0.44);
  ctx.fillStyle = '#9fe0d0';
  ctx.font = `500 ${Math.round(h * 0.06)}px ${PIXEL_FONT}`;
  const touch = window.matchMedia('(hover: none)').matches;
  ctx.fillText(`${touch ? 'tap' : 'hover'} a project to tune in`, w / 2, h * 0.6);
  ctx.fillText('▶', w / 2, h * 0.72);
}

export function createTv(screen: THREE.Mesh) {
  const mat = crtMaterial();
  screen.material = mat;

  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext('2d')!;
  drawIdle(ctx);
  const idle = new THREE.CanvasTexture(canvas);
  idle.colorSpace = THREE.SRGBColorSpace;
  mat.uniforms.map.value = idle;
  // redraw once the pixel font has arrived
  document.fonts?.load(`700 32px ${PIXEL_FONT}`).then(() => {
    drawIdle(ctx);
    idle.needsUpdate = true;
  }).catch(() => {});

  const loader = new THREE.TextureLoader();
  const stills = new Map<number, THREE.Texture>();
  const videos = new Map<number, { el: HTMLVideoElement; tex: THREE.VideoTexture }>();
  let current: number | null = null;
  let staticAmt = 0;

  const still = (i: number) => {
    let tex = stills.get(i);
    if (!tex) {
      tex = loader.load(projectData[i].imageUrl);
      tex.colorSpace = THREE.SRGBColorSpace;
      stills.set(i, tex);
    }
    return tex;
  };

  const video = (i: number) => {
    let v = videos.get(i);
    if (!v) {
      const el = document.createElement('video');
      el.src = projectData[i].videoUrl;
      el.muted = true;
      el.loop = true;
      el.playsInline = true;
      el.preload = 'auto';
      const tex = new THREE.VideoTexture(el);
      tex.colorSpace = THREE.SRGBColorSpace;
      v = { el, tex };
      videos.set(i, v);
    }
    return v;
  };

  const show = (i: number | null) => {
    if (i === current) return;
    videos.forEach((v, k) => {
      if (k !== i) v.el.pause();
    });
    current = i;
    staticAmt = 1;
    if (i === null) {
      mat.uniforms.map.value = idle;
      return;
    }
    mat.uniforms.map.value = still(i);
    const v = video(i);
    const swap = () => {
      if (current === i) mat.uniforms.map.value = v.tex;
    };
    if (v.el.readyState >= 2) swap();
    else v.el.addEventListener('loadeddata', swap, { once: true });
    v.el.currentTime = 0;
    v.el.play().catch(() => {});
  };

  const update = (t: number, dt: number) => {
    mat.uniforms.uTime.value = t;
    staticAmt = Math.max(0, staticAmt - dt * 3.5);
    mat.uniforms.uStatic.value = staticAmt * 0.85;
  };

  const dispose = () => {
    videos.forEach((v) => {
      v.el.pause();
      v.el.removeAttribute('src');
      v.el.load();
      v.tex.dispose();
    });
    stills.forEach((s) => s.dispose());
    idle.dispose();
  };

  return { show, update, dispose };
}
