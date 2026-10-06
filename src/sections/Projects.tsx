import { useState } from 'react';
import { projectData } from '../content';
import { GithubIcon } from '../components/Icons';
import { rv } from '../components/reveal';

interface ProjectsProps {
  // tunes the cabin TV to a project's video
  onPreview: (index: number) => void;
}

function Projects({ onPreview }: ProjectsProps) {
  const [active, setActive] = useState<number | null>(null);

  const preview = (index: number) => {
    setActive(index);
    onPreview(index);
  };

  return (
    <div className="tv-projects" data-scroll>
      <ul className={`tv-list ${active !== null ? 'has-active' : ''}`}>
        {projectData.map((project, index) => (
          <li
            key={project.id}
            className={`tv-item rv ${active === index ? 'active' : ''}`}
            style={rv(index)}
            onMouseEnter={() => preview(index)}
            onFocus={() => preview(index)}
            onClick={() => preview(index)}
          >
            <div className="tv-item-head">
              <h2 className="tv-item-title" tabIndex={0}>
                {project.title}
              </h2>
              {project.githubUrl && (
                <a
                  href={project.githubUrl}
                  className="tv-item-link"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`View ${project.title} source on GitHub`}
                >
                  <GithubIcon width={16} height={16} />
                </a>
              )}
            </div>
            <p className="tv-item-text">{project.description}</p>
            <p className="tv-item-tags">{project.tags.join(' · ')}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Projects;
