import { SECTIONS, pad2 } from '../sectionConfig';
import { ArrowIcon, CloseIcon, ViewpointIcon } from './Icons';
import Navbar from './Navbar';

interface HudProps {
  active: number;
  onNavigate: (index: number) => void;
  // look-around toggle: offered only once the camera has come to a full stop
  canView: boolean;
  viewing: boolean;
  onToggleView: () => void;
}

function Hud({ active, onNavigate, canView, viewing, onToggleView }: HudProps) {
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

        <div className="hud-center">
          <button
            type="button"
            className={`hud-view ${canView || viewing ? 'available' : ''} ${viewing ? 'viewing' : ''}`}
            aria-label={viewing ? 'Exit look around' : 'Look around'}
            title={viewing ? 'Exit look around (Esc)' : 'Look around'}
            disabled={!canView && !viewing}
            onClick={onToggleView}
          >
            {viewing ? <CloseIcon /> : <ViewpointIcon />}
          </button>
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
