import { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useHomeTabRequest } from '@/contexts/HomeTabRequestContext';
import { useIsMobile, useScrollRestoration } from '@shared/hooks';
import { ThemeToggle, AboutDropdown, VersionFooter } from '@features/theme';
import { IllnessNotification } from '@features/illnesses';
import OnboardingOverlay from '@features/onboarding/components/OnboardingOverlay';
import BottomTabBar from './BottomTabBar';
import MoreMenuSheet from './MoreMenuSheet';
import OfflineIndicator from '@shared/components/OfflineIndicator';
import UpdateToast from '@shared/components/UpdateToast';
import styles from './Layout.module.css';

interface LayoutProps {
  children: ReactNode;
}

function Layout({ children }: LayoutProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const homeTabRequest = useHomeTabRequest();
  const isMobile = useIsMobile();
  useScrollRestoration();

  const handleLogoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    homeTabRequest?.requestFamilyTab();
    navigate('/', { state: { tab: 'family' } });
  };

  return (
    <div className={`${styles.container} ${isMobile ? styles.containerMobile : ''}`}>
      <OfflineIndicator />
      <UpdateToast />
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
              <span className={`${styles.userName} ${styles.hideOnMobile}`} title={user.email}>
                {user.username}
              </span>
            )}
            <IllnessNotification />
            {/* About + theme toggle live in the More sheet on mobile to free up
                header space; keep them visible on tablet+. */}
            <span className={styles.hideOnMobile}>
              <AboutDropdown />
            </span>
            <span className={styles.hideOnMobile}>
              <ThemeToggle />
            </span>
            {/* Mobile-only: dropdown menu (replaces former drawer-from-top sheet). */}
            {isMobile ? <MoreMenuSheet /> : null}
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.contentWrapper}>
          {children}
        </div>
      </main>
      <div className={`${styles.footerWrapper} ${styles.hideOnMobile}`}>
        <VersionFooter />
      </div>

      {isMobile ? <BottomTabBar /> : null}
    </div>
  );
}

export default Layout;
