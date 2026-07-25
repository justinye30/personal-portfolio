import { useEffect, useRef, useState } from 'react';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

function Navbar({ currentTab, setCurrentTab }: NavbarProps) {
  const tabs = ['home', 'about', 'projects', 'experience', 'contact'];
  const [menuOpen, setMenuOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  const handleSelect = (tab: string) => {
    setCurrentTab(tab);
    setMenuOpen(false);
  };

  useEffect(() => {
    if (!menuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleScroll = () => setMenuOpen(false);

    document.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [menuOpen]);

  return (
    <nav className="navbar" ref={navRef}>
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
        <span></span>
      </button>

      <ul id="primary-nav" className={`navbar-links ${menuOpen ? 'open' : ''}`}>
        {tabs.map((tab) => (
          <li key={tab}>
            <button
              onClick={() => handleSelect(tab)}
              className={`nav-button ${currentTab === tab ? 'active' : ''}`}
            >
              {'> '}{tab.charAt(0).toUpperCase() + tab.slice(1)}
              <span className={`nav-cursor ${currentTab === tab ? 'active' : ''}`}>_</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default Navbar;
