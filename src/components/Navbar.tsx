interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

function Navbar({ currentTab, setCurrentTab }: NavbarProps) {
  const tabs = ['home', 'projects', 'experience', 'contact'];

  return (
    <nav className="navbar">
      <ul className="navbar-links">
        {tabs.map((tab) => (
          <li key={tab}>
            <button
              onClick={() => setCurrentTab(tab)}
              className={`nav-button ${currentTab === tab ? 'active' : ''}`}
            >
              {tab.toUpperCase()}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default Navbar;