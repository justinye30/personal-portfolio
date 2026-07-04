interface Job {
  id: number;
  company: string;
  role: string;
  duration: string;
}

function Experience() {
  const jobHistory: Job[] = [
    {
      id: 1,
      company: "Sharkbyte",
      role: "Software Development Intern",
      duration: "May 2022 - August 2022",
    },
    {
      id: 2,
      company: "Tech Retro Corp",
      role: "Junior Full-Stack Engineer",
      duration: "September 2022 - Present",
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
              <div className="job-logo-placeholder">
                <span>Logo</span>
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