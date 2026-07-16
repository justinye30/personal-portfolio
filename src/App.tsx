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
    // The section whose top has scrolled past this line (in viewport px) is active.
    const ACTIVE_LINE = 150;

    const updateActiveSection = () => {
      // Near the bottom of the page a short last section may never scroll
      // its top past ACTIVE_LINE, so force it active once we hit bottom.
      const atBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      if (atBottom) {
        setActiveSection(SECTION_IDS[SECTION_IDS.length - 1]);
        return;
      }

      let current = SECTION_IDS[0];
      for (const id of SECTION_IDS) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= ACTIVE_LINE) {
          current = id;
        }
      }
      setActiveSection(current);
    };

    updateActiveSection();

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        updateActiveSection();
        ticking = false;
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
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
