import { SECTIONS, pad2 } from '../sectionConfig';
import Footer from './Footer';
import { ArrowIcon, GithubIcon, LinkedinIcon, MailIcon } from './Icons';
import Navbar from './Navbar';

interface HudProps {
  active: number;
  onNavigate: (index: number) => void;
}

function Hud({ active, onNavigate }: HudProps) {
  const last = SECTIONS.length - 1;
  return (
    <>
      <Navbar active={active} onNavigate={onNavigate} />

      <div className="hud-socials">
        <a href="https://github.com/justinye30" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
          <GithubIcon />
        </a>
        <a href="https://www.linkedin.com/in/justin-ye0/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
          <LinkedinIcon />
        </a>
        <a href="mailto:justinye787@gmail.com" aria-label="Email">
          <MailIcon />
        </a>
        <span className="hud-socials-line" />
      </div>

      <div className="hud-bottom">
        <div className="hud-progress" aria-live="polite">
          <p className="hud-counter">
            <span className="hud-counter-current">{pad2(active + 1)}</span>
            <span className="hud-counter-total">/ {pad2(SECTIONS.length)}</span>
          </p>
          <div className="hud-bars" aria-label="Locations">
            {SECTIONS.map((s, i) => (
              <button
                key={s.id}
                type="button"
                aria-current={active === i ? 'location' : undefined}
                aria-label={`${s.label} — ${s.place}`}
                className={`hud-bar ${i === active ? 'active' : ''} ${i < active ? 'past' : ''}`}
                onClick={() => onNavigate(i)}
              />
            ))}
          </div>
          <p className="hud-place">{SECTIONS[active].place}</p>
        </div>

        <div className={`hud-hint ${active === 0 ? 'visible' : ''}`} aria-hidden={active !== 0}>
          <span className="hud-mouse"><span /></span>
          <span className="hint-desktop">Scroll or press <kbd>→</kbd> to explore</span>
          <span className="hint-touch">Swipe to explore</span>
        </div>

        <div className="hud-arrows">
          <button type="button" className="hud-arrow" onClick={() => onNavigate(active - 1)} disabled={active === 0} aria-label="Previous location">
            <ArrowIcon direction="left" />
          </button>
          <button type="button" className="hud-arrow" onClick={() => onNavigate(active + 1)} disabled={active === last} aria-label="Next location">
            <ArrowIcon direction="right" />
          </button>
        </div>
      </div>

      <Footer />
    </>
  );
}

export default Hud;
