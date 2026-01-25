import { Link, useLocation } from 'react-router-dom';

function Navigation() {
  const location = useLocation();
  
  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <nav className="navigation">
      <Link 
        to="/" 
        className={`nav-link ${isActive('/') && location.pathname !== '/settings' ? 'active' : ''}`}
      >
        Children
      </Link>
      <Link 
        to="/settings" 
        className={`nav-link ${isActive('/settings') ? 'active' : ''}`}
      >
        Settings
      </Link>
    </nav>
  );
}

export default Navigation;
