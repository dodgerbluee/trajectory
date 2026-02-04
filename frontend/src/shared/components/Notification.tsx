import { useEffect } from 'react';
import styles from './Notification.module.css';

interface NotificationProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
  duration?: number;
}

function Notification({ message, type, onClose, duration = 5000 }: NotificationProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div className={`${styles.root} ${styles[type]}`}>
      <div className={styles.content}>
        <span className={styles.icon}>
          {type === 'success' && '✓'}
          {type === 'error' && '✗'}
          {type === 'info' && 'ℹ'}
        </span>
        <span className={styles.message}>{message}</span>
      </div>
      <button type="button" onClick={onClose} className={styles.close} aria-label="Close">
        ×
      </button>
    </div>
  );
}

export default Notification;
