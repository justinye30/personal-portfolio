import SectionTitle from '../components/SectionTitle';

function About() {
  return (
    <section id="about">
      <SectionTitle text="A Little Bit About Myself" className="about-title" />

      <div className="about-text">
        <p>
          Currently studying at the University of British Columbia,
          I have a passion for building software to help create
          a more sustainable and accessible future.
        </p>
        <p>
          Outside of work, I like playing basketball and volleyball, as
          well as performing as a saxophonist in a jazz band!
        </p>
      </div>

      <div className="skills-section">
        <p className="skills-title">
          <strong>Technologies I have worked with:</strong>
        </p>

        <div className="skills-grid">
          <div className="skills-column">
            <p className="skills-column-title">Frontend</p>
            <ul>
              <li>HTML</li>
              <li>CSS</li>
              <li>JavaScript</li>
              <li>TypeScript</li>
              <li>React</li>
              <li>SEO</li>
            </ul>
          </div>

          <div className="skills-column">
            <p className="skills-column-title">Backend</p>
            <ul>
              <li>
                Python
                <ul>
                  <li>AI agents &amp; tools</li>
                </ul>
              </li>
              <li>
                Java
                <ul>
                  <li>GUIs</li>
                </ul>
              </li>
              <li>
                Node.js
                <ul>
                  <li>Express</li>
                </ul>
              </li>
              <li>C#</li>
              <li>PHP</li>
            </ul>
          </div>

          <div className="skills-column">
            <p className="skills-column-title">Other Languages &amp; Tools</p>
            <ul>
              <li>
                R
                <ul>
                  <li>Data Science</li>
                </ul>
              </li>
              <li>Git</li>
              <li>MySQL</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

export default About;
