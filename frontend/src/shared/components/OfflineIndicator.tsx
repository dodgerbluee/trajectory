import { useOnlineStatus } from '@shared/hooks';
import styles from './OfflineIndicator.module.css';

/**
 * Small banner pinned to the top of the viewport when the browser reports
 * `navigator.onLine === false`. Cached data is still readable via the service
 * worker; this only signals that mutations and fresh data won't work.
 */
function OfflineIndicator() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div className={styles.banner} role="status" aria-live="polite">
      <span className={styles.dot} aria-hidden="true" />
      <span>You're offline — viewing cached data. Changes won't save until you reconnect.</span>
    </div>
  );
}

export default OfflineIndicator;
