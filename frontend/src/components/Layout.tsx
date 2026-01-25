import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import AboutDropdown from './AboutDropdown';
import IllnessNotification from './IllnessNotification';

interface LayoutProps {
  children: ReactNode;
}

function Layout({ children }: LayoutProps) {
  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <Link to="/" className="header-brand">
            <img 
              src="/logo/trajectory.png" 
              alt="Trajectory Logo" 
              className="app-logo"
            />
            <h1 className="app-title">Trajectory</h1>
          </Link>
          <div className="header-actions">
            <IllnessNotification />
            <AboutDropdown />
            <ThemeToggle />
          </div>
        </div>
      </header>
      
      <main className="app-main">
        <div className="content-wrapper">
          {children}
        </div>
      </main>
      
      <footer className="app-footer">
        <div className="footer-content">
          <p>Trajectory &copy; {new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  );
}

export default Layout;
