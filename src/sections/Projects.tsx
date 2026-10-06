import { useRef } from 'react';
import dishlyImg from '../assets/img-dishly.webp';
import jobListingsImg from '../assets/img-job-listings.webp';
import osuRemakeImg from '../assets/img-osu-remake.webp';
import pixlrImg from '../assets/img-pixlr.webp';
import smartReaderImg from '../assets/img-smart-reader.webp';
import dishlyVideo from '../assets/vid-dishly.mp4';
import jobListingsVideo from '../assets/vid-job-listings.mp4';
import osuRemakeVideo from '../assets/vid-osu-remake.mp4';
import pixlrVideo from '../assets/vid-pixlr.mp4';
import smartReaderVideo from '../assets/vid-smart-reader.mp4';
import SectionHeading from '../components/SectionHeading';
import { GithubIcon } from '../components/Icons';
import { rv } from '../components/reveal';

interface Project {
  id: number;
  title: string;
  description: string;
  tags: string[];
  githubUrl?: string;
  imageUrl?: string;
  videoUrl?: string;
}

const projectData: Project[] = [
  {
    id: 1,
    title: "Dishly",
    description: "AI-powered full-stack web app for discovering new recipes.",
    tags: ["React", "Gemini API", "Spoonacular API", "Express.js", "Axios", "Playwright", "Vitest"],
    githubUrl: "https://github.com/cuhacking-dishly/CU-Hack",
    imageUrl: dishlyImg,
    videoUrl: dishlyVideo,
  },
  {
    id: 2,
    title: "Pixler",
    description: "Multi-level 2D platformer game with structured gameplay and animation systems",
    tags: ["Unity", "C#"],
    githubUrl: "https://github.com/justinye30/Pixlr-2D-platformer-game",
    imageUrl: pixlrImg,
    videoUrl: pixlrVideo,
  },
  {
    id: 3,
    title: "Job Listings Tracker",
    description: "Full-stack job listing platform with secure user authentication.",
    tags: ["JavaScript", "PHP", "Laravel", "MySQL"],
    imageUrl: jobListingsImg,
    videoUrl: jobListingsVideo,
  },
  {
    id: 4,
    title: "Smart Reader",
    description: "Web extension created to enhance web accessibility through UI adjustments and assistive features.",
    tags: ["JavaScript"],
    githubUrl: "https://github.com/justinye30/Simple-Accesibility-Extension",
    imageUrl: smartReaderImg,
    videoUrl: smartReaderVideo,
  },
  {
    id: 5,
    title: "Osu Remake",
    description: "Remake of the popular game Osu using Java's GUI toolkit.",
    tags: ["Java", "Java Swing"],
    githubUrl: "https://github.com/justinye30/osu-remake",
    imageUrl: osuRemakeImg,
    videoUrl: osuRemakeVideo,
  },
];

function ProjectCard({ project, index }: { project: Project; index: number }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleMouseEnter = () => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    video.play().catch(() => {});
  };

  const handleMouseLeave = () => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
  };

  return (
    <article
      className="project-card rv"
      style={rv(index + 2)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="project-media">
        <img src={project.imageUrl} alt={project.title} className="project-image" loading="lazy" decoding="async" />
        {project.videoUrl && (
          <video
            ref={videoRef}
            src={project.videoUrl}
            className="project-video"
            muted
            loop
            playsInline
            preload="none"
          />
        )}
        <span className="project-index">{String(index + 1).padStart(2, '0')}</span>
      </div>

      <div className="project-body">
        <div className="project-header">
          <h2 className="project-title">{project.title}</h2>
          {project.githubUrl && (
            <a
              href={project.githubUrl}
              className="project-github"
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`View ${project.title} source on GitHub`}
            >
              <GithubIcon width={17} height={17} />
            </a>
          )}
        </div>

        <p className="project-text">{project.description}</p>

        <ul className="project-tags">
          {project.tags.map((tag) => (
            <li key={tag}>{tag}</li>
          ))}
        </ul>
      </div>
    </article>
  );
}

function Projects() {
  return (
    <div className="projects-layout">
      <SectionHeading index={2} title="Some Things I've Built" className="projects-heading" />

      <div className="projects-strip" data-scroll>
        {projectData.map((project, index) => (
          <ProjectCard key={project.id} project={project} index={index} />
        ))}
      </div>
    </div>
  );
}

export default Projects;
