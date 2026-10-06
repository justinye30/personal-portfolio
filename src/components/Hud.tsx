import { SECTIONS, pad2 } from '../sectionConfig';
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
          <span className="hint-desktop">Scroll or press <kbd>→</kbd> to explore</span>
          <span className="hint-touch">Swipe to explore</span>
        </div>
      </div>
    </>
  );
}

export default Hud;
