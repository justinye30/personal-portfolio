import { useEffect } from 'react';
import developforgood from '../assets/develop-for-good-logo.jpg';
import sharkbyte from '../assets/sharkbyte-logo.png';

interface Job {
  id: number;
  company: string;
  role: string;
  duration: string;
  imageUrl: string;
}

function Experience() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

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
      <h1 className="experience-title">My Experience</h1>
      
      <div className="experience-list">
        {jobHistory.map((job) => (
          <div key={job.id} className="job-card">
            <h2 className="job-company">{job.company}</h2>
            
            <div className="job-content">
              <div className="job-logo">
                <img src={job.imageUrl} alt={job.company} className="logo-image" />
              </div>
              <div className="job-details">
                <h3 className="job-role">{job.role}</h3>
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