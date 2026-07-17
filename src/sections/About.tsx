import SectionTitle from '../components/SectionTitle';

function About() {
  return (
    <section id="about">
      <SectionTitle text="About Me" className="about-title" />

      <div className="about-text">
        <p>
          Currently studying at the University of British Columbia,
          I have a passion for building software to help create
          a more sustainable and accessible future.
        </p>
        <p>
          Outside of work, I love playing basketball and volleyball, as
          well as performing as a saxophonist in a jazz band.
        </p>
      </div>
    </section>
  );
}

export default About;
