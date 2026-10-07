import { SECTIONS, pad2 } from '../sectionConfig';
import { ArrowIcon } from './Icons';
import Navbar from './Navbar';

interface HudProps {
  active: number;
  onNavigate: (index: number) => void;
}

function Hud({ active, onNavigate }: HudProps) {
  return (
    <>
      <Navbar active={active} onNavigate={onNavigate} />

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
          <span className="hint-desktop">Scroll or use arrow keys to explore</span>
          <span className="hint-touch">Swipe to explore</span>
        </div>

        <div className="hud-arrows">
          <button
            type="button"
            className="hud-arrow"
            aria-label="Previous location"
            disabled={active === 0}
            onClick={() => onNavigate(active - 1)}
          >
            <ArrowIcon style={{ transform: 'scaleX(-1)' }} />
          </button>
          <button
            type="button"
            className="hud-arrow"
            aria-label="Next location"
            disabled={active === SECTIONS.length - 1}
            onClick={() => onNavigate(active + 1)}
          >
            <ArrowIcon />
          </button>
        </div>
      </div>
    </>
  );
}

export default Hud;
