import sampleWhite from '../assets/SQUARE.jpg';
import githubIconImg from '../assets/icon-github.png';

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
            
            <div className="screen-inner">
              <img src={project.imageUrl} alt={project.title} className="screen-image" />
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
                  <img src={githubIconImg} alt="GitHub Link" className="console-github-icon-img" />
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