import { useState } from 'react';
import Navbar from './components/Navbar';
import Home from './sections/Home';
import Projects from './sections/Projects';
import Experience from './sections/Experience';
import Contact from './sections/Contact';

function App() {
  // Set the default view to 'home'
  const [currentTab, setCurrentTab] = useState('home');

  // Helper function to figure out which component to display
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
    <div style={{ fontFamily: 'sans-serif', minHeight: '100vh', backgroundColor: '#f9f9f9' }}>
      {/* Pass the state and setter function down to the Navbar */}
      <Navbar currentTab={currentTab} setCurrentTab={setCurrentTab} />
      
      {/* Render the selected section area */}
      <main style={{ padding: '2rem' }}>
        {renderSection()}
      </main>
    </div>
  );
}

export default App;
