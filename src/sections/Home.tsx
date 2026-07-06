import { useEffect } from 'react';
import Typewriter from 'typewriter-effect';

function Home() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <section id="home" className="home-container">
      <div className="home-content">
        <div className="home-title">
          <h1>Hi, I'm Justin!</h1>
        </div>
        <div className="home-text">
          <h2>
            I'm a developer who's interested in{' '}
            <span className="typewriter-span">
              <Typewriter
                options={{
                  strings: [
                    'full-stack development.',
                    'machine learning.',
                    'accessibility.',
                    'UX/UI.',
                    'agentic systems.',
                    'databases.',
                    'game development.',
                  ],
                  autoStart: true,
                  loop: true,
                  delay: 75,
                  deleteSpeed: 50,
                }}
              />
            </span>
          </h2>
        </div>
      </div>
    </section>
  );
}

export default Home;