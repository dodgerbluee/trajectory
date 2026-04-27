/**
 * MoreMenuSheet – mobile "More" dropdown anchored to the header hamburger.
 *
 * Owns its own trigger (LuMenu button) and dropdown panel. Mirrors the
 * desktop AboutDropdown pattern: small floating panel, top-right of the
 * header, click-outside / Escape to close. Footer info (Trajectory version
 * + GitHub link) lives at the bottom of the panel on mobile, since the
 * floating-chip footer is hidden on phones.
 */

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LuMenu,
  LuSettings,
  LuUsers,
  LuShieldCheck,
  LuLogOut,
  LuMoon,
  LuSun,
  LuInfo,
  LuGithub,
} from 'react-icons/lu';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import packageJson from '../../../package.json';
import styles from './MoreMenuSheet.module.css';

const GITHUB_REPO_URL = 'https://github.com/dodgerbluee/trajectory';
const APP_NAME = 'Trajectory';
const version =
  (import.meta.env?.VITE_APP_VERSION as string) || packageJson.version;

function MoreMenuSheet() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { effectiveTheme, toggleTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const close = () => setIsOpen(false);

  const go = (path: string) => {
    close();
    navigate(path);
  };

  const handleLogout = async () => {
    close();
    try {
      await logout();
    } finally {
      navigate('/login');
    }
  };

  // Click-outside + Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const handlePointer = (e: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        close();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('touchstart', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('touchstart', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isOpen]);

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        type="button"
        className={styles.trigger}
        aria-label="Open menu"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        onClick={() => setIsOpen((v) => !v)}
      >
        <LuMenu aria-hidden="true" />
      </button>

      {isOpen && (
        <div className={styles.menu} role="menu">
          {user ? (
            <div className={styles.userBlock}>
              <div className={styles.userName}>{user.username}</div>
              <div className={styles.userEmail}>{user.email}</div>
            </div>
          ) : null}

          <ul className={styles.list}>
            <li>
              <button
                type="button"
                className={styles.row}
                onClick={() => go('/settings')}
                role="menuitem"
              >
                <LuSettings className={styles.rowIcon} aria-hidden="true" />
                <span className={styles.rowLabel}>Settings</span>
              </button>
            </li>
            <li>
              <button
                type="button"
                className={styles.row}
                onClick={() => go('/settings')}
                role="menuitem"
              >
                <LuUsers className={styles.rowIcon} aria-hidden="true" />
                <span className={styles.rowLabel}>Family</span>
              </button>
            </li>
            {user?.isInstanceAdmin ? (
              <li>
                <button
                  type="button"
                  className={styles.row}
                  onClick={() => go('/admin')}
                  role="menuitem"
                >
                  <LuShieldCheck className={styles.rowIcon} aria-hidden="true" />
                  <span className={styles.rowLabel}>Admin</span>
                </button>
              </li>
            ) : null}
            <li>
              <button
                type="button"
                className={styles.row}
                onClick={() => {
                  toggleTheme();
                  // keep menu open so the user can see the theme flip; closes on next outside click
                }}
                role="menuitem"
              >
                {effectiveTheme === 'dark' ? (
                  <LuSun className={styles.rowIcon} aria-hidden="true" />
                ) : (
                  <LuMoon className={styles.rowIcon} aria-hidden="true" />
                )}
                <span className={styles.rowLabel}>
                  {effectiveTheme === 'dark' ? 'Light theme' : 'Dark theme'}
                </span>
              </button>
            </li>
            <li>
              <button
                type="button"
                className={styles.row}
                onClick={() => go('/settings')}
                role="menuitem"
              >
                <LuInfo className={styles.rowIcon} aria-hidden="true" />
                <span className={styles.rowLabel}>About</span>
              </button>
            </li>
            <li>
              <button
                type="button"
                className={`${styles.row} ${styles.danger}`}
                onClick={handleLogout}
                role="menuitem"
              >
                <LuLogOut className={styles.rowIcon} aria-hidden="true" />
                <span className={styles.rowLabel}>Log out</span>
              </button>
            </li>
          </ul>

          {/* Footer: GitHub link + app version (mobile-only — desktop has its
              own VersionFooter pinned at the bottom-right of the layout). */}
          <div className={styles.footer}>
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.footerLink}
              aria-label="View repository on GitHub"
              onClick={close}
            >
              <LuGithub className={styles.footerIcon} aria-hidden="true" />
              <span>GitHub</span>
            </a>
            <span className={styles.footerSeparator} aria-hidden="true">
              |
            </span>
            <span
              className={styles.footerVersion}
              aria-label={`${APP_NAME} v${version}`}
            >
              {APP_NAME} v{version}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default MoreMenuSheet;
