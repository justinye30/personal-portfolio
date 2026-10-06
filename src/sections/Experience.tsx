import developforgood from '../assets/logo-develop-for-good.webp';
import sharkbyte from '../assets/logo-sharkbyte.webp';
import SectionHeading from '../components/SectionHeading';
import { rv } from '../components/reveal';

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

  return (
    <div className="panel panel-right experience-panel" data-scroll>
      <SectionHeading index={3} title="My Experience" />

      <ol className="experience-list">
        {jobHistory.map((job, index) => (
          <li key={job.id} className="job-card rv" style={rv(index + 2)}>
            <div className="job-logo">
              <img src={job.imageUrl} alt={job.company} loading="lazy" decoding="async" />
            </div>
            <div className="job-details">
              <p className="job-date">{job.duration}</p>
              <h2 className="job-role">{job.role}</h2>
              <h3 className="job-company">{job.company}</h3>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default Experience;
