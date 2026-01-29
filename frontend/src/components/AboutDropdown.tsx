import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { HiChevronDown } from 'react-icons/hi';
import { useAuth } from '../contexts/AuthContext';

function AboutDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { logout } = useAuth();

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
    <div className="about-dropdown" ref={dropdownRef}>
      <button
        className="about-dropdown-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <HiChevronDown className="about-dropdown-icon" />
      </button>
      {isOpen && (
        <div className="about-dropdown-menu">
          <Link
            to="/settings"
            className="about-dropdown-item"
            onClick={() => setIsOpen(false)}
          >
            Settings
          </Link>
          <button
            type="button"
            className="about-dropdown-item"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

export default AboutDropdown;
