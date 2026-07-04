interface Project {
  id: number;
  title: string;
  description: string;
  tags: string[];
  githubUrl: string;
  demoUrl?: string;
}

function Projects() {
  const projectData: Project[] = [
    {
      id: 1,
      title: "Project Alpha",
      description: "A full-stack web application designed to handle real-time data streaming and analysis with optimized queries.",
      tags: ["React", "TypeScript", "Vite", "Node.js"],
      githubUrl: "#",
      demoUrl: "#",
    },
    {
      id: 2,
      title: "Project Beta",
      description: "An elegant solution utilizing complex algorithms to maximize process efficiency across various data platforms.",
      tags: ["React", "Tailwind CSS", "PostgreSQL"],
      githubUrl: "#",
    },
    {
      id: 3,
      title: "Project Gamma",
      description: "Turning service APIs into a cohesive UI layout framework.",
      tags: ["TypeScript", "Express", "API Integration"],
      githubUrl: "#",
      demoUrl: "#",
    },
  ];

  return (
    <section id="projects">
      <h1 className="projects-title">My Projects</h1>
      
      <div className="projects-grid">
        {projectData.map((project) => (
          <div key={project.id} className="project-card">
            <div className="project-image-placeholder">
              <span>IMAGE PLACEHOLDER</span>
            </div>

            <div className="project-details">
              <h2 className="project-card-title">{project.title}</h2>
              <p className="project-card-text">{project.description}</p>
              
              <div className="project-tags">
                {project.tags.map((tag, idx) => (
                  <span key={idx} className="tag">{tag}</span>
                ))}
              </div>

              <div className="project-buttons">
                <a href={project.githubUrl} className="btn btn-github">GitHub</a>
                {project.demoUrl && (
                  <a href={project.demoUrl} className="btn btn-demo">Demo</a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default Projects;