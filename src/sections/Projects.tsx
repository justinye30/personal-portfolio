import githubIconImg from '../assets/icon-github.png';
import SectionTitle from '../components/SectionTitle';

interface Project {
  id: number;
  title: string;
  description: string;
  tags: string[];
  githubUrl?: string;
  imageUrl?: string;
}

function Projects() {
  const projectData: Project[] = [
    {
      id: 1,
      title: "Dishly",
      description: "AI-powered full-stack web app for discovering new recipes.",
      tags: ["React", "Gemini API", "Spoonacular API", "Express.js", "Axios", "Playwright", "Vitest"],
      githubUrl: "https://github.com/cuhacking-dishly/CU-Hack",
      imageUrl: githubIconImg,
    },
    {
      id: 2,
      title: "Pixlr",
      description: "Multi-level 2D platformer game with structured gameplay and animation systems",
      tags: ["Unity", "C#"],
      githubUrl: "https://github.com/justinye30/Pixlr-2D-platformer-game",
      imageUrl: githubIconImg,
    },
    {
      id: 3,
      title: "Job Listings Tracker",
      description: "Full-stack job listing platform with secure user authentication.",
      tags: ["JavaScript", "PHP", "Laravel", "MySQL"],
      imageUrl: githubIconImg,
    },
    {
      id: 4,
      title: "Smart Reader",
      description: "Web extension created to enhance web accessibility through UI adjustments and assistive features.",
      tags: ["JavaScript"],
      githubUrl: "https://github.com/justinye30/Simple-Accesibility-Extension",
      imageUrl: githubIconImg,
    },
    {
      id: 5,
      title: "Osu Remake",
      description: "Remake of the popular game Osu using Java's GUI toolkit.",
      tags: ["Java", "Java Swing"],
      githubUrl: "https://github.com/justinye30/osu-remake",
      imageUrl: githubIconImg,
    },
  ];

  return (
    <section id="projects">
      <SectionTitle text="My Projects" className="projects-title" />
      
      <div className="projects-grid">
        {projectData.map((project) => (
          <div key={project.id} className="retro-console-card">

            <div className="console-titlebar">
              <div className="titlebar-dots"><span></span><span></span><span></span></div>
              <span className="titlebar-filename">{project.title.replace(/\s+/g, '')}.log</span>
              <div className="titlebar-status"></div>
            </div>

            <div className="screen-inner">
                <img src={project.imageUrl} alt={project.title} className="screen-image" />
            </div>

            <div className="console-controls">
                <div className="console-header-row">
                <h2 className="console-card-title">{project.title}</h2>
                {project.githubUrl && (
                    <a
                        href={project.githubUrl}
                        className="console-github-icon"
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="View Source on GitHub"
                    >
                        <img src={githubIconImg} alt="GitHub Link" className="console-github-icon-img" />
                    </a>
                )}
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