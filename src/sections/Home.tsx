import { useEffect, useRef, useState } from 'react';
import Typewriter from 'typewriter-effect';

function Home() {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [titleVisible, setTitleVisible] = useState(false);

  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setTitleVisible(entry.isIntersecting);
        });
      },
      { threshold: 0.4 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="home" className="home-container">
      <div className="home-content">
        <p className="prompt-line">$ whoami</p>
        <div className="home-title">
          <h1 ref={titleRef}>
            {titleVisible ? (
              <Typewriter
                onInit={(typewriter) => {
                  typewriter
                    .typeString("Hi, I'm Justin!")
                    .callFunction(({ elements }) => {
                      elements.cursor.style.display = 'none';
                    })
                    .start();
                }}
                options={{
                  loop: false,
                  delay: 40,
                }}
              />
            ) : (
              <span>&nbsp;</span>
            )}
          </h1>
        </div>
        <div className="home-text">
          <h2>
            I'm a software engineer who's interested in{' '}
            <span className="typewriter-span">
              <Typewriter
                options={{
                  strings: [
                    'full-stack development.',
                    'machine learning.',
                    'agentic systems.',
                    'databases.',
                    'game development.',
                    'accessibility.',
                  ],
                  autoStart: true,
                  loop: true,
                  delay: 40,
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