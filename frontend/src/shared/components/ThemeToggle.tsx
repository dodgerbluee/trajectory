import { useTheme } from '../../contexts/ThemeContext';
import styles from './ThemeToggle.module.css';

function ThemeToggle() {
  const { effectiveTheme, toggleTheme } = useTheme();

  return (
    <button
      className={styles.toggleDot}
      onClick={toggleTheme}
      aria-label={`Switch to ${effectiveTheme === 'light' ? 'dark' : 'light'} mode`}
      title={`Switch to ${effectiveTheme === 'light' ? 'dark' : 'light'} mode`}
    >
      <span className={styles.dot} />
    </button>
  );
}

export default ThemeToggle;
