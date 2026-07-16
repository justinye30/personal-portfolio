import { useEffect, useState } from 'react';
import Navbar from './components/Navbar';
import Home from './sections/Home';
import About from './sections/About';
import Projects from './sections/Projects';
import Experience from './sections/Experience';
import Contact from './sections/Contact';
import emailIcon from './assets/icon-email.png';
import githubIcon from './assets/icon-github.png';
import linkedinIcon from './assets/icon-linkedin.png';

const SECTION_IDS = ['home', 'about', 'projects', 'experience', 'contact'];

function App() {
  const [activeSection, setActiveSection] = useState('home');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: '-40% 0px -55% 0px' }
    );

    SECTION_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const scrollToSection = (tab: string) => {
    document.getElementById(tab)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div style={{ minHeight: '100vh'}}>
      <div className="crt-overlay" />

      <Navbar currentTab={activeSection} setCurrentTab={scrollToSection} />

      <div className="page-body">
        <div className="side-icons">
          <a href="https://github.com/justinye30" target="_blank" rel="noopener noreferrer" className="side-icons-icon" aria-label="GitHub">
            <img src={githubIcon} alt="" />
          </a>
          <div className="side-icons-line" />
          <a href="https://www.linkedin.com/in/justin-ye0/" target="_blank" rel="noopener noreferrer" className="side-icons-icon" aria-label="LinkedIn">
            <img src={linkedinIcon} alt="" />
          </a>
          <div className="side-icons-line" />
          <a href="mailto:justinye787@gmail.com" className="side-icons-icon" aria-label="Email">
            <img src={emailIcon} alt="" />
          </a>
          <div className="side-icons-tail" />
        </div>

        <div className="side-rail">
          <div className="side-rail-circle" />
          <div className="side-rail-tail" />
        </div>

        <div className="side-tag">
          <span>justinye787@gmail.com</span>
          <div className="side-tag-tail" />
        </div>

        <main>
          <Home />
          <About />
          <Projects />
          <Experience />
          <Contact />
        </main>
      </div>
    </div>
  );
}

export default App;
