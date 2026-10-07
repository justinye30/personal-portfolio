import { projectData } from '../content';
import { GithubIcon } from '../components/Icons';
import { rv } from '../components/reveal';

interface ProjectsProps {
  // the project the cabin TV is tuned to (null: idle screen)
  active: number | null;
  onPreview: (index: number) => void;
}

function Projects({ active, onPreview }: ProjectsProps) {
  return (
    <div className="tv-projects" data-scroll>
      <ul className={`tv-list ${active !== null ? 'has-active' : ''}`}>
        {projectData.map((project, index) => (
          <li
            key={project.id}
            className={`tv-item rv ${active === index ? 'active' : ''}`}
            style={rv(index)}
            onMouseEnter={() => onPreview(index)}
            onFocus={() => onPreview(index)}
            onClick={() => onPreview(index)}
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
