import { jobHistory } from '../content';

// The experience is written onto a standing stone in the 3D scene. This copy is for
// screen readers, and becomes the visible fallback when WebGL isn't available.
function Experience() {
  return (
    <div className="experience-text">
      <ol className="experience-list">
        {jobHistory.map((job) => (
          <li key={job.id} className="job-card">
            <img className="job-logo" src={job.imageUrl} alt="" loading="lazy" decoding="async" />
            <div>
              <h2 className="job-company">{job.company}</h2>
              <p className="job-role">{job.role}</p>
              <p className="job-date">{job.duration}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default Experience;
