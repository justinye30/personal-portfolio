import * as THREE from 'three';

// Shared so every standing stone (including the inscribed one) shades identically.
export const stoneMaterial = new THREE.MeshLambertMaterial({ color: '#a59ab3', flatShading: true });
