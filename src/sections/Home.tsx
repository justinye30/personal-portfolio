import Typewriter from 'typewriter-effect';
import { rv } from '../components/reveal';

function Home() {
  return (
    <div className="home-hero">
      <p className="eyebrow prompt-line rv" style={rv(0)}>$ whoami</p>
      <h1 className="hero-title rv" style={rv(1)}>
        <span className="hero-hi">Hi,</span> <span className="hero-name">I'm Justin!</span>
      </h1>
      <h2 className="hero-sub rv" style={rv(2)}>
        I'm a software engineer who's interested in{' '}
        <span className="hero-typer">
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
  );
}

export default Home;
