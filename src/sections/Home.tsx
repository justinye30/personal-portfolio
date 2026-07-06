import { useEffect } from 'react';
import starImg from '../assets/star.png';

function Home() {
  useEffect(() => {
    document.body.classList.add('home-page-body');

    return () => {
      document.body.classList.remove('home-page-body');
    };
  }, []);

  return (
    <section id="home" className="home-container">
      <div className="home-content">
        <h1>Hi, I'm Justin!</h1>
        <h2>
          I'm a software engineer who's interested in full-stack development
        </h2>
      </div>

      <div className="home-stars-bg">
        <img src={starImg} alt="" className="bg-star star-giant" />
        <img src={starImg} alt="" className="bg-star star-small-top" />
        <img src={starImg} alt="" className="bg-star star-small-right" />
        <img src={starImg} alt="" className="bg-star star-small-bottom" />
      </div>
    </section>
  );
}

export default Home;