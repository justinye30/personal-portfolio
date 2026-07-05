import sampleWhite from '../assets/white.jpg';

interface Project {
  id: number;
  title: string;
  description: string;
  tags: string[];
  githubUrl: string;
  imageUrl?: string;
}

function Projects() {
  const projectData: Project[] = [
    {
      id: 1,
      title: "Project Alpha",
      description: "A full-stack web application designed to handle real-time data streaming and analysis with optimized queries.",
      tags: ["React", "TypeScript", "Vite", "Node.js"],
      githubUrl: "#",
      imageUrl: sampleWhite,
    },
    {
      id: 2,
      title: "Project Beta",
      description: "An elegant solution utilizing complex algorithms to maximize process efficiency across various data platforms.",
      tags: ["React", "Tailwind CSS", "PostgreSQL"],
      githubUrl: "#",
      imageUrl: sampleWhite,
    },
    {
      id: 3,
      title: "Project Gamma",
      description: "Turning service APIs into a cohesive UI layout framework.",
      tags: ["TypeScript", "Express", "API Integration"],
      githubUrl: "#",
      imageUrl: sampleWhite,
    },
  ];

  return (
    <section id="projects">
      <h1 className="projects-title">My Projects</h1>
      
      <div className="projects-grid">
        {projectData.map((project) => (
          <div key={project.id} className="retro-console-card">
            
            <div className="console-screen">
              <div className="screen-inner">
                <img src={project.imageUrl} alt={project.title} className="screen-image" />
              </div>
            </div>

            <div className="console-controls">

              <div className="console-header-row">
                <h2 className="console-card-title">{project.title}</h2>
                <a 
                  href={project.githubUrl} 
                  className="console-github-icon"
                  target="_blank" 
                  rel="noopener noreferrer"
                  aria-label="View Source on GitHub"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                </a>
              </div>

              <p className="console-card-text">{project.description}</p>

              <div className="console-buttons-grid">
                {project.tags.map((tag, idx) => (
                  <div key={idx} className="console-btn-tag">
                    <span className="btn-inner">{tag}</span>
                  </div>
                ))}
              </div>

            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default Projects;