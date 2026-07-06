import { useEffect } from 'react';

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
          <h2>I'm a software engineer who's interested in full-stack development</h2>
        </div>
      </div>
    </section>
  );
}

export default Home;