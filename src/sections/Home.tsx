import Typewriter from 'typewriter-effect';

function Home() {
  return (
    <section id="home" className="home-container">
      <div className="home-content">
        <p className="prompt-line">$ whoami</p>
        <div className="home-title">
          <h1>
            <Typewriter
              onInit={(typewriter) => {
                typewriter
                  .typeString("Hi, I'm Justin!")
                  .start();
              }}
              options={{
                loop: false,
                delay: 40,
              }}
            />
          </h1>
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