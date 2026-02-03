import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { HiChevronDown } from 'react-icons/hi';
import { useAuth } from '../../contexts/AuthContext';
import styles from './AboutDropdown.module.css';

function AboutDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    setIsOpen(false);
    await logout();
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className={styles.root} ref={dropdownRef}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        data-onboarding="settings-menu"
      >
        <HiChevronDown className={styles.icon} aria-hidden />
      </button>
      {isOpen && (
        <div className={styles.menu} role="menu">
          <Link
            to="/settings"
            className={styles.item}
            onClick={() => setIsOpen(false)}
            data-onboarding="settings-menu-item"
            role="menuitem"
          >
            Settings
          </Link>
          {user?.isInstanceAdmin && (
            <Link
              to="/admin"
              className={styles.item}
              onClick={() => setIsOpen(false)}
              role="menuitem"
            >
              Admin
            </Link>
          )}
          <button
            type="button"
            className={styles.item}
            onClick={handleLogout}
            role="menuitem"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

export default AboutDropdown;
