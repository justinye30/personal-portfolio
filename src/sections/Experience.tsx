import { useEffect } from 'react';
import developforgood from '../assets/develop-for-good-logo.jpg';
import sharkbyte from '../assets/sharkbyte-logo.png';
import Typewriter from 'typewriter-effect';

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
      <h1 className="experience-title">
        <Typewriter
          onInit={(typewriter) => {
            typewriter
              .typeString("My Experience")
              .start();
          }}
          options={{
            loop: false,
            delay: 40,
          }}
        />
      </h1>
      
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
                <h2 className="job-company">{job.company}</h2>
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