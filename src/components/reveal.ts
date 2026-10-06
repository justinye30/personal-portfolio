import type { CSSProperties } from 'react';

// Stagger index for `.rv` elements; they animate in when their stage becomes active.
export const rv = (i: number) => ({ '--i': i }) as CSSProperties;
