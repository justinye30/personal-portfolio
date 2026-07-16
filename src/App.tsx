import { useState } from 'react';
import Navbar from './components/Navbar';
import Home from './sections/Home';
import Projects from './sections/Projects';
import Experience from './sections/Experience';
import Contact from './sections/Contact';
import emailIcon from './assets/icon-email.png';
import githubIcon from './assets/icon-github.png';
import linkedinIcon from './assets/icon-linkedin.png';

function App() {
  const [currentTab, setCurrentTab] = useState('home');

  const renderSection = () => {
    switch (currentTab) {
      case 'home':
        return <Home />;
      case 'projects':
        return <Projects />;
      case 'experience':
        return <Experience />;
      case 'contact':
        return <Contact />;
      default:
        return <Home />;
    }
  };

  return (
    <div style={{ minHeight: '100vh'}}>
      <div className="crt-overlay" />

      <div className="side-rail">
        <a href="https://github.com/justinye30" target="_blank" rel="noopener noreferrer" className="side-rail-icon" aria-label="GitHub">
          <img src={githubIcon} alt="" />
        </a>
        <div className="side-rail-line" />
        <a href="https://www.linkedin.com/in/justin-ye0/" target="_blank" rel="noopener noreferrer" className="side-rail-icon" aria-label="LinkedIn">
          <img src={linkedinIcon} alt="" />
        </a>
        <div className="side-rail-line" />
        <a href="mailto:justinye787@gmail.com" className="side-rail-icon" aria-label="Email">
          <img src={emailIcon} alt="" />
        </a>
        <div className="side-rail-tail" />
      </div>

      <div className="side-tag">
        <span>justinye787@gmail.com</span>
        <div className="side-tag-tail" />
      </div>

      <Navbar currentTab={currentTab} setCurrentTab={setCurrentTab} />

      <main>
        {renderSection()}
      </main>
    </div>
  );
}

export default App;
