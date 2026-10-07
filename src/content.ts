import dishlyImg from './assets/img-dishly.webp';
import dogginAroundImg from './assets/img-doggin-around.webp';
import pixlrImg from './assets/img-pixlr.webp';
import smartReaderImg from './assets/img-smart-reader.webp';
import dishlyVideo from './assets/vid-dishly.mp4';
import dogginAroundVideo from './assets/vid-doggin-around.mp4';
import pixlrVideo from './assets/vid-pixlr.mp4';
import smartReaderVideo from './assets/vid-smart-reader.mp4';
import developforgood from './assets/logo-develop-for-good.webp';
import sharkbyte from './assets/logo-sharkbyte.webp';

// Shared by the HTML overlays and the 3D world (cabin TV, inscribed stone).

export interface Project {
  id: number;
  title: string;
  description: string;
  tags: string[];
  githubUrl?: string;
  imageUrl: string;
  videoUrl: string;
}

export const projectData: Project[] = [
  {
    id: 5,
    title: "Doggin' Around",
    description: "Interactive 3D world with Gaussian-splat dogs",
    tags: ["TypeScript", "Three.js", "PyTorch", "ElevenAPI", "Rapier", "Spark"],
    githubUrl: "https://github.com/DzhanybekZakiriiaev/doggin-around",
    imageUrl: dogginAroundImg,
    videoUrl: dogginAroundVideo,
  },
  {
    id: 1,
    title: "Dishly",
    description: "AI-powered web app for recipe discovery",
    tags: ["React", "Gemini API", "Express.js", "Axios", "Playwright", "Vitest"],
    githubUrl: "https://github.com/cuhacking-dishly/CU-Hack",
    imageUrl: dishlyImg,
    videoUrl: dishlyVideo,
  },
  {
    id: 2,
    title: "Pixler",
    description: "Multi-level 2D platformer game",
    tags: ["Unity", "C#"],
    githubUrl: "https://github.com/justinye30/Pixlr-2D-platformer-game",
    imageUrl: pixlrImg,
    videoUrl: pixlrVideo,
  },
  {
    id: 4,
    title: "Smart Reader",
    description: "Web extension to enhance accessibility",
    tags: ["JavaScript"],
    githubUrl: "https://github.com/justinye30/Simple-Accesibility-Extension",
    imageUrl: smartReaderImg,
    videoUrl: smartReaderVideo,
  },
];

export interface Job {
  id: number;
  company: string;
  role: string;
  duration: string;
  imageUrl: string;
}

export const jobHistory: Job[] = [
  {
    id: 1,
    company: "Develop For Good",
    role: "Technical Manager Intern",
    duration: "May 2026 - August 2026",
    imageUrl: developforgood,
  },
  {
    id: 2,
    company: "Sharkbyte",
    role: "Software Developer Intern",
    duration: "June 2024 - July 2024",
    imageUrl: sharkbyte,
  },
];
