// Order matters: it is both the scroll order and the camera route through the world.
export const SECTIONS = [
  { id: 'home', label: 'Home', place: 'The Valley' },
  { id: 'projects', label: 'Projects', place: 'The Cabin' },
  { id: 'experience', label: 'Experience', place: 'The Standing Stones' },
  { id: 'contact', label: 'Contact', place: 'The Summit' },
] as const;

export const pad2 = (n: number) => String(n).padStart(2, '0');
