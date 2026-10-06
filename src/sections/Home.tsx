import { rv } from '../components/reveal';

function Home() {
  return (
    <div className="home-hero">
      <h1 className="hero-title rv" style={rv(0)}>
        Hi, I'm Justin!
      </h1>
      <p className="hero-sub rv" style={rv(1)}>
        Currently studying at the University of British Columbia,
        I have a passion for building software to help create
        a more sustainable and accessible future.
      </p>
    </div>
  );
}

export default Home;
