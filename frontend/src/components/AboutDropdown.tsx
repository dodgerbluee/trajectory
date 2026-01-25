import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { HiChevronDown } from 'react-icons/hi';

function AboutDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
            to="/kids-management"
            className="about-dropdown-item"
            onClick={() => setIsOpen(false)}
          >
            Family
          </Link>
          <Link
            to="/settings"
            className="about-dropdown-item"
            onClick={() => setIsOpen(false)}
          >
            Settings
          </Link>
        </div>
      )}
    </div>
  );
}

export default AboutDropdown;
