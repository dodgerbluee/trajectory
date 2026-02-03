import { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useHomeTabRequest } from '../contexts/HomeTabRequestContext';
import ThemeToggle from './ThemeToggle';
import AboutDropdown from './AboutDropdown';
import IllnessNotification from './IllnessNotification';
import VersionFooter from './VersionFooter';
import { OnboardingOverlay } from './onboarding';
import styles from './Layout.module.css';

interface LayoutProps {
  children: ReactNode;
}

function Layout({ children }: LayoutProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const homeTabRequest = useHomeTabRequest();

  const handleLogoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    homeTabRequest?.requestFamilyTab();
    navigate('/', { state: { tab: 'family' } });
  };

  return (
    <div className={styles.container}>
      <OnboardingOverlay />
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <Link to="/" className={styles.headerBrand} onClick={handleLogoClick}>
            <img
              src="/logo/trajectory.png"
              alt="Trajectory Logo"
              className={styles.appLogo}
            />
            <h1 className={styles.appTitle}>Trajectory</h1>
          </Link>
          <div className={styles.headerActions}>
            {user && (
              <span className={styles.userName} title={user.email}>
                {user.username}
              </span>
            )}
            <IllnessNotification />
            <AboutDropdown />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.contentWrapper}>
          {children}
        </div>
      </main>
      <div className={styles.footerWrapper}>
        <VersionFooter />
      </div>
    </div>
  );
}

export default Layout;
