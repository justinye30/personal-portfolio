import { useState } from 'react';
import Navbar from './components/Navbar';
import Home from './sections/Home';
import Projects from './sections/Projects';
import Experience from './sections/Experience';
import Contact from './sections/Contact';

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
      <Navbar currentTab={currentTab} setCurrentTab={setCurrentTab} />
      
      <main style={{ padding: '2rem' }}>
        {renderSection()}
      </main>
    </div>
  );
}

export default App;
