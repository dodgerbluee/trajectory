import { useTheme } from '../contexts/ThemeContext';

function ThemeToggle() {
  const { effectiveTheme, toggleTheme } = useTheme();

  return (
    <button
      className="theme-toggle-dot"
      onClick={toggleTheme}
      aria-label={`Switch to ${effectiveTheme === 'light' ? 'dark' : 'light'} mode`}
      title={`Switch to ${effectiveTheme === 'light' ? 'dark' : 'light'} mode`}
    >
      <span className="theme-dot"></span>
    </button>
  );
}

export default ThemeToggle;
