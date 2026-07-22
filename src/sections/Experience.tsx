import developforgood from '../assets/logo-develop-for-good.jpg';
import sharkbyte from '../assets/logo-sharkbyte.png';
import SectionTitle from '../components/SectionTitle';

interface Job {
  id: number;
  company: string;
  role: string;
  duration: string;
  imageUrl: string;
}

function Experience() {
  const jobHistory: Job[] = [
    {
      id: 1,
      company: "Develop For Good",
      role: "Technical Manager",
      duration: "May 2026 - August 2026",
      imageUrl: developforgood,
    },
    {
      id: 2,
      company: "Sharkbyte",
      role: "Software Development Intern",
      duration: "June 2024 - July 2024",
      imageUrl: sharkbyte,
    },
  ];

  return (
    <section id="experience">
      <SectionTitle text="My Experience" className="experience-title" />
      
      <div className="experience-list">
        {jobHistory.map((job) => (
          <div key={job.id} className="job-card">
            <div className="console-titlebar">
              <div className="titlebar-dots"><span></span><span></span><span></span></div>
              <span className="titlebar-filename">{job.company.replace(/\s+/g, '')}.log</span>
              <div className="titlebar-status"></div>
            </div>

            <div className="job-body">
              <div className="job-logo">
                <img src={job.imageUrl} alt={job.company} className="logo-image" />
              </div>
              <div className="job-details">
                <h2 className="job-role">{job.role}</h2>
                <h3 className="job-company">{job.company}</h3>
                <p className="job-date">{job.duration}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default Experience;