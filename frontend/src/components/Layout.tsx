import { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useHomeTabRequest } from '../contexts/HomeTabRequestContext';
import ThemeToggle from './ThemeToggle';
import AboutDropdown from './AboutDropdown';
import IllnessNotification from './IllnessNotification';
import Button from './Button';

interface LayoutProps {
  children: ReactNode;
}

function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const homeTabRequest = useHomeTabRequest();

  const handleLogout = async () => {
    await logout();
  };

  const handleLogoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    homeTabRequest?.requestFamilyTab();
    navigate('/', { state: { tab: 'family' } });
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <Link to="/" className="header-brand" onClick={handleLogoClick}>
            <img 
              src="/logo/trajectory.png" 
              alt="Trajectory Logo" 
              className="app-logo"
            />
            <h1 className="app-title">Trajectory</h1>
          </Link>
          <div className="header-actions">
            {user && (
              <span className="user-name" title={user.email}>
                {user.name}
              </span>
            )}
            <IllnessNotification />
            <AboutDropdown />
            <ThemeToggle />
            {user && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleLogout}
                className="logout-button"
              >
                Logout
              </Button>
            )}
          </div>
        </div>
      </header>
      
      <main className="app-main">
        <div className="content-wrapper">
          {children}
        </div>
      </main>
    </div>
  );
}

export default Layout;
