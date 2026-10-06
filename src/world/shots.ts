import { CAMP, STONES, heightAt } from './layout';

// Camera stops, in section order. `offset` shifts the projection centre (fraction of the
// viewport) so the landmark sits beside the text panel instead of behind it.
export interface Shot {
  id: string;
  pos: [number, number, number];
  target: [number, number, number];
  offset: [number, number];
  mobileOffset: [number, number];
}

const g = (x: number, z: number, h: number): [number, number, number] => [x, heightAt(x, z) + h, z];
const hilltop = heightAt(STONES.x, STONES.z);

export const SHOTS: Shot[] = [
  {
    id: 'home',
    pos: [-18, 74, 150],
    target: [-6, 38, -40],
    offset: [-0.1, 0.04],
    mobileOffset: [0, 0.16],
  },
  {
    id: 'about',
    pos: [2, 4.4, 15],
    target: [-50, 10, -24],
    offset: [-0.17, 0.02],
    mobileOffset: [0, 0.2],
  },
  {
    id: 'projects',
    pos: g(66, -18, 5.5),
    target: g(88, -52, 11),
    offset: [0, 0.16],
    mobileOffset: [0, 0.22],
  },
  {
    id: 'experience',
    pos: [STONES.x + 19, hilltop + 6.5, STONES.z + 19],
    target: [STONES.x - 2, hilltop + 4.5, STONES.z - 3],
    offset: [0.17, 0.02],
    mobileOffset: [0, 0.2],
  },
  {
    id: 'contact',
    pos: g(CAMP.x - 14, CAMP.z + 15, 4.6),
    target: g(CAMP.x + 3, CAMP.z - 4, 2.2),
    offset: [-0.15, 0.02],
    mobileOffset: [0, 0.2],
  },
];
