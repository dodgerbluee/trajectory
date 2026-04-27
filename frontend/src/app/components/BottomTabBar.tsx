/**
 * BottomTabBar – mobile-only fixed navigation at the bottom of the viewport.
 *
 * Five slots: Home, Visits, [+] Add (FAB-style center), Illnesses, Trends.
 *
 * Navigation strategy:
 *   - Home      → `/` with state { tab: 'family' }
 *   - Visits    → `/` with state { tab: 'visits' }
 *   - Add       → `/visits/new` (which shows the existing VisitTypeModal)
 *   - Illnesses → `/` with state { tab: 'illnesses' }
 *   - Trends    → `/` with state { tab: 'trends' }
 *
 * The "More" menu (Settings, Family, Admin, Theme, About, Logout) lives in the
 * header drop-down on mobile (rendered by Layout) so it's always one tap away
 * regardless of which page you're on.
 *
 * Active state: derived from the current pathname + location.state.tab.
 *
 * Rendered only on mobile (the parent Layout decides this via useIsMobile).
 */

import { useLocation, useNavigate } from 'react-router-dom';
import {
  LuHouse,
  LuCalendarDays,
  LuPlus,
  LuTrendingUp,
  LuThermometer,
} from 'react-icons/lu';
import { useHomeTabRequest } from '@/contexts/HomeTabRequestContext';
import styles from './BottomTabBar.module.css';

type BottomTab = 'home' | 'visits' | 'trends' | 'illnesses';

function BottomTabBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const homeTabRequest = useHomeTabRequest();
  const stateTab = (location.state as { tab?: string } | null)?.tab;

  const active: BottomTab | null = (() => {
    const path = location.pathname;
    if (path === '/' || path === '') {
      if (stateTab === 'visits') return 'visits';
      if (stateTab === 'trends') return 'trends';
      if (stateTab === 'illnesses') return 'illnesses';
      return 'home';
    }
    if (path.startsWith('/illnesses')) return 'illnesses';
    if (path.startsWith('/visits')) return 'visits';
    return null;
  })();

  const goHomeTab = (tab: 'family' | 'visits' | 'trends' | 'illnesses') => {
    if (tab === 'family') homeTabRequest?.requestFamilyTab?.();
    navigate('/', { state: { tab } });
  };

  return (
    <nav className={styles.bar} aria-label="Primary" data-testid="bottom-tab-bar">
      <ul className={styles.list}>
        <li>
          <button
            type="button"
            className={`${styles.tab} ${active === 'home' ? styles.active : ''}`}
            aria-current={active === 'home' ? 'page' : undefined}
            onClick={() => goHomeTab('family')}
          >
            <LuHouse className={styles.icon} aria-hidden="true" />
            <span className={styles.label}>Home</span>
          </button>
        </li>

        <li>
          <button
            type="button"
            className={`${styles.tab} ${active === 'visits' ? styles.active : ''}`}
            aria-current={active === 'visits' ? 'page' : undefined}
            onClick={() => goHomeTab('visits')}
          >
            <LuCalendarDays className={styles.icon} aria-hidden="true" />
            <span className={styles.label}>Visits</span>
          </button>
        </li>

        <li className={styles.fabSlot}>
          <button
            type="button"
            className={styles.fab}
            aria-label="Add visit"
            onClick={() => navigate('/visits/new')}
          >
            <LuPlus className={styles.fabIcon} aria-hidden="true" />
          </button>
        </li>

        <li>
          <button
            type="button"
            className={`${styles.tab} ${active === 'illnesses' ? styles.active : ''}`}
            aria-current={active === 'illnesses' ? 'page' : undefined}
            onClick={() => goHomeTab('illnesses')}
          >
            <LuThermometer className={styles.icon} aria-hidden="true" />
            <span className={styles.label}>Illnesses</span>
          </button>
        </li>

        <li>
          <button
            type="button"
            className={`${styles.tab} ${active === 'trends' ? styles.active : ''}`}
            aria-current={active === 'trends' ? 'page' : undefined}
            onClick={() => goHomeTab('trends')}
          >
            <LuTrendingUp className={styles.icon} aria-hidden="true" />
            <span className={styles.label}>Trends</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}

export default BottomTabBar;
