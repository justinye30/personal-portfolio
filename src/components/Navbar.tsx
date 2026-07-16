interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

function Navbar({ currentTab, setCurrentTab }: NavbarProps) {
  const tabs = ['home', 'about', 'projects', 'experience', 'contact'];

  return (
    <nav className="navbar">
      <ul className="navbar-links">
        {tabs.map((tab) => (
          <li key={tab}>
            <button
              onClick={() => setCurrentTab(tab)}
              className={`nav-button ${currentTab === tab ? 'active' : ''}`}
            >
              {'> '}{tab.charAt(0).toUpperCase() + tab.slice(1)}
              <span className={currentTab === tab ? 'nav-cursor' : ''}>_</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default Navbar;