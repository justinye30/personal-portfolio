import SectionTitle from '../components/SectionTitle';

function About() {
  return (
    <section id="about">
      <SectionTitle text="About Me" className="about-title" />

      <div className="about-text">
        <p>
          [Placeholder] Write a short introduction here — who you are, where
          you're studying or working, and the kind of problems you enjoy
          solving. Two or three sentences is plenty for a first paragraph.
        </p>
        <p>
          [Placeholder] A second paragraph can cover life outside of code —
          interests, hobbies, what you're currently learning, or what you're
          looking for next.
        </p>
      </div>
    </section>
  );
}

export default About;
