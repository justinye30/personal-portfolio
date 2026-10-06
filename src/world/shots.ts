import { tvScreenLocal } from './cabin';
import { cabinToWorld, heightAt, tabletFrame } from './layout';

type V3 = [number, number, number];

// Camera stops, in section order. `offset` shifts the projection centre (fraction of the
// viewport) so the subject sits beside the text instead of behind it. `waypoints` are flown
// through (in order) before arriving — and in reverse when leaving — e.g. through a doorway.
// `via` are scenic points flown through on any trip to or from the stop (e.g. a low pass
// over the lake), before its waypoints.
export interface Shot {
  id: string;
  pos: V3;
  target: V3;
  offset: [number, number];
  mobileOffset: [number, number];
  waypoints?: V3[];
  via?: V3[];
  portrait?: { pos: V3; target: V3 };
  night?: boolean;
}

const g = (x: number, z: number, h: number): V3 => [x, heightAt(x, z) + h, z];
const add = (a: V3, b: V3, k = 1): V3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];

const tv = tvScreenLocal();
const tablet = tabletFrame();
const up: V3 = [0, 1, 0];

export const SHOTS: Shot[] = [
  {
    id: 'home',
    pos: [-18, 74, 150],
    target: [-6, 38, -40],
    offset: [-0.1, 0.04],
    mobileOffset: [0, 0.16],
  },
  {
    id: 'projects',
    pos: cabinToWorld(1.9, 3.3, 2.3),
    target: cabinToWorld(tv.pos[0], tv.pos[1], tv.pos[2]),
    offset: [0.2, 0],
    mobileOffset: [0, 0.22],
    waypoints: [cabinToWorld(2.2, 3.6, 17), cabinToWorld(2.2, 3.0, 8.5), cabinToWorld(2.2, 2.95, 5.0)],
  },
  {
    id: 'experience',
    // stone sits in the left third; the hilltop and valley fill the rest of the frame
    pos: add(add(tablet.center, tablet.normal, 11), up, 0.7),
    target: add(add(tablet.center, tablet.right, 3.1), up, 0.3),
    offset: [0, 0],
    mobileOffset: [0, 0],
    portrait: {
      pos: add(add(tablet.center, tablet.normal, 12.5), up, 0.6),
      target: add(tablet.center, up, -0.2),
    },
  },
  {
    id: 'contact',
    pos: g(-28, -150, 16),
    target: [-40, 230, -420],
    offset: [0, 0],
    mobileOffset: [0, 0],
    // same spot on phones; the default portrait pull-back would land in the trees
    portrait: { pos: g(-28, -150, 16), target: [-40, 200, -420] },
    night: true,
  },
];

export const CABIN_SHOT = SHOTS.findIndex((s) => s.id === 'projects');
