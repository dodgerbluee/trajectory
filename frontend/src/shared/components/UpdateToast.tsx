import { useRegisterSW } from 'virtual:pwa-register/react';
import styles from './UpdateToast.module.css';

/**
 * In-app toast that appears when a new service worker is waiting. Tapping
 * "Refresh" calls the worker's skipWaiting + reloads the page so the user
 * adopts the new build deliberately, not silently mid-form-fill.
 *
 * Sticky bottom on mobile (clears the bottom tab bar via safe-area), top-right
 * on tablet+. Dismissible — the toast reappears on the next SW update event.
 */
function UpdateToast() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div className={styles.toast} role="status" aria-live="polite">
      <span className={styles.message}>A new version of Trajectory is available.</span>
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.btnSecondary}
          onClick={() => setNeedRefresh(false)}
        >
          Later
        </button>
        <button
          type="button"
          className={styles.btnPrimary}
          onClick={() => updateServiceWorker(true)}
        >
          Refresh
        </button>
      </div>
    </div>
  );
}

export default UpdateToast;
