import { useEffect, useState } from 'react';
import { SECTIONS, pad2 } from '../sectionConfig';

interface NavbarProps {
  active: number;
  onNavigate: (index: number) => void;
}

function Navbar({ active, onNavigate }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const select = (index: number) => {
    setMenuOpen(false);
    onNavigate(index);
  };

  return (
    <header className="navbar">
      <button type="button" className="brand" onClick={() => select(0)} aria-label="Justin Ye — go to home">
        <span className="brand-first">Justin</span>
        <span className="brand-last">Ye</span>
      </button>

      <button
        type="button"
        className={`nav-toggle ${menuOpen ? 'open' : ''}`}
        onClick={() => setMenuOpen((open) => !open)}
        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={menuOpen}
        aria-controls="primary-nav"
      >
        <span></span>
        <span></span>
      </button>

      <nav id="primary-nav" className={`navbar-links ${menuOpen ? 'open' : ''}`} aria-label="Sections">
        <ul>
          {SECTIONS.map((section, i) => (
            <li key={section.id}>
              <button
                type="button"
                onClick={() => select(i)}
                className={`nav-button ${active === i ? 'active' : ''}`}
                aria-current={active === i ? 'location' : undefined}
              >
                <span className="nav-num">{pad2(i + 1)}</span>
                <span className="nav-label">{section.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}

export default Navbar;
