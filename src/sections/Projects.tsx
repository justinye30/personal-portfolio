import { useState, type CSSProperties } from 'react';
import { projectData, type Project } from '../content';
import { ArrowIcon, GithubIcon } from '../components/Icons';
import { rv } from '../components/reveal';

// Desktop shows the list a page at a time; phones flatten the pages into one scrolling list.
const PER_PAGE = 3;
const PAGES: Project[][] = [];
for (let i = 0; i < projectData.length; i += PER_PAGE) PAGES.push(projectData.slice(i, i + PER_PAGE));

interface ProjectsProps {
  // the project the cabin TV is tuned to (null: idle screen)
  active: number | null;
  onPreview: (index: number) => void;
}

function Projects({ active, onPreview }: ProjectsProps) {
  const [page, setPage] = useState(0);

  return (
    <div className="tv-projects" data-scroll>
      <div className="tv-pages" style={{ '--page': page } as CSSProperties}>
        {PAGES.map((items, p) => (
          <ul
            key={p}
            className={`tv-list ${p === page ? 'current' : ''} ${active !== null ? 'has-active' : ''}`}
            style={{ '--p': p } as CSSProperties}
            aria-label={PAGES.length > 1 ? `Projects, page ${p + 1} of ${PAGES.length}` : undefined}
          >
            {items.map((project, i) => {
              const index = p * PER_PAGE + i;
              return (
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
              );
            })}
          </ul>
        ))}
      </div>

      {PAGES.length > 1 && (
        <div className="tv-pager rv" style={rv(PER_PAGE)}>
          <button
            type="button"
            className="tv-pager-btn"
            aria-label="Previous projects"
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
          >
            <ArrowIcon width={16} height={16} style={{ transform: 'scaleX(-1)' }} />
          </button>
          <span className="tv-pager-count" aria-live="polite">
            {page + 1} / {PAGES.length}
          </span>
          <button
            type="button"
            className="tv-pager-btn"
            aria-label="More projects"
            disabled={page === PAGES.length - 1}
            onClick={() => setPage(page + 1)}
          >
            <ArrowIcon width={16} height={16} />
          </button>
        </div>
      )}
    </div>
  );
}

export default Projects;
