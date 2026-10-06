import * as THREE from 'three';
import { jobHistory } from '../content';
import { TABLET, tabletFrame } from './layout';
import { stoneMaterial } from './materials';
import { mulberry32 } from './noise';

const PIXEL_FONT = '"Pixelify Sans", "JetBrains Mono", monospace';
const INK = 'rgba(40, 30, 52, 0.92)';
const CARVE = 'rgba(255, 246, 236, 0.28)';

const CANVAS_W = 1024;
const CANVAS_H = 1060;
// text area on the face, in stone-local units (centred slightly above the middle)
const TEXT_W = TABLET.w * 0.84;
const TEXT_H = TEXT_W * (CANVAS_H / CANVAS_W);
const TEXT_Y = 0.05;

// A rough standing slab with chipped edges like the rest of the circle and a mostly flat face. Alongside it we return
// a "decal" made from the slab's own front-face triangles, so the writing follows every facet
// and reads as etched into the stone rather than stuck on top.
function tabletGeometry() {
  const { w, h, d } = TABLET;
  const g = new THREE.BoxGeometry(w, h, d, 3, 3, 1);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const rand = mulberry32(2718);
  const offsets = new Map<string, [number, number, number]>();
  const eps = 0.001;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const key = `${x.toFixed(3)},${y.toFixed(3)},${z.toFixed(3)}`;
    if (!offsets.has(key)) {
      const onFace = z > d / 2 - eps && Math.abs(x) < w / 2 - eps && Math.abs(y) < h / 2 - eps;
      const top = y > h / 2 - eps ? 0.35 : 0.14;
      // the inscribed face is a naturally flat side: a few broad, gently tilted facets so it
      // still looks like rock, while the text stays straight and readable
      offsets.set(
        key,
        onFace
          ? [(rand() - 0.5) * 0.06, (rand() - 0.5) * 0.06, (rand() - 0.5) * 0.06]
          : [(rand() - 0.5) * 0.3, (rand() - 0.5) * top * 2, (rand() - 0.5) * 0.26],
      );
    }
    const o = offsets.get(key)!;
    const taper = 1 - 0.07 * (y / h + 0.5);
    pos.setXYZ(i, x * taper + o[0], y + o[1], z + o[2]);
  }

  // decal: the front (+z) face triangles, UV-mapped by projecting their final positions
  // straight onto the face plane, so lines of text stay level while still hugging the facets
  const front = g.groups[4];
  const index = g.index!;
  const decalPos: number[] = [];
  const decalUv: number[] = [];
  for (let k = front.start; k < front.start + front.count; k++) {
    const i = index.getX(k);
    decalPos.push(pos.getX(i), pos.getY(i), pos.getZ(i) + 0.012);
    decalUv.push(pos.getX(i) / TEXT_W + 0.5, (pos.getY(i) - TEXT_Y) / TEXT_H + 0.5);
  }
  const decal = new THREE.BufferGeometry();
  decal.setAttribute('position', new THREE.Float32BufferAttribute(decalPos, 3));
  decal.setAttribute('uv', new THREE.Float32BufferAttribute(decalUv, 2));
  decal.computeVertexNormals();

  const flat = g.toNonIndexed();
  g.dispose();
  flat.computeVertexNormals();
  return { stone: flat, decal };
}

function fitFont(ctx: CanvasRenderingContext2D, text: string, weight: number, size: number, maxWidth: number) {
  let s = size;
  ctx.font = `${weight} ${s}px ${PIXEL_FONT}`;
  while (ctx.measureText(text).width > maxWidth && s > 12) {
    s -= 2;
    ctx.font = `${weight} ${s}px ${PIXEL_FONT}`;
  }
  return s;
}

function carvedText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number) {
  ctx.fillStyle = CARVE;
  ctx.fillText(text, x + 2, y + 3);
  ctx.fillStyle = INK;
  ctx.fillText(text, x, y);
}

function draw(ctx: CanvasRenderingContext2D, logos: (HTMLImageElement | null)[]) {
  const { width: W, height: H } = ctx.canvas;
  ctx.clearRect(0, 0, W, H);
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  const margin = 70;
  const maxW = W - margin * 2;

  const logo = 150;
  let y = 120;
  jobHistory.forEach((job, i) => {
    fitFont(ctx, job.company, 700, 112, maxW);
    carvedText(ctx, job.company, margin, y);
    y += 150;
    const img = logos[i];
    if (img) {
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.roundRect(margin + 6, y, logo, logo, 14);
      ctx.clip();
      ctx.drawImage(img, margin + 6, y, logo, logo);
      ctx.restore();
    }
    const tx = margin + logo + 44;
    const tw = W - margin - tx;
    fitFont(ctx, job.role, 500, 50, tw);
    carvedText(ctx, job.role, tx, y + 18);
    fitFont(ctx, job.duration, 500, 44, tw);
    carvedText(ctx, job.duration, tx, y + 88);
    y += logo + 130;
  });
}

export function createInscription() {
  const frame = tabletFrame();
  const group = new THREE.Group();
  group.name = 'inscription';
  group.position.set(...frame.base);
  group.rotation.y = Math.atan2(frame.normal[0], frame.normal[2]);

  const geo = tabletGeometry();
  const stone = new THREE.Mesh(geo.stone, stoneMaterial);
  stone.position.y = TABLET.h / 2;
  stone.castShadow = true;
  stone.receiveShadow = true;
  group.add(stone);

  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext('2d')!;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;

  // flat-shaded like the stone, so the lettering catches light facet by facet
  const text = new THREE.Mesh(
    geo.decal,
    new THREE.MeshLambertMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
      flatShading: true,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    }),
  );
  text.position.y = TABLET.h / 2;
  text.receiveShadow = true;
  group.add(text);

  const logos: (HTMLImageElement | null)[] = jobHistory.map(() => null);
  const redraw = () => {
    draw(ctx, logos);
    tex.needsUpdate = true;
  };
  jobHistory.forEach((job, i) => {
    const img = new Image();
    img.onload = () => {
      logos[i] = img;
      redraw();
    };
    img.src = job.imageUrl;
  });
  redraw();
  document.fonts?.load(`700 64px ${PIXEL_FONT}`).then(redraw).catch(() => {});

  return group;
}
