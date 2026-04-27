import { useEffect, useState } from 'react';

/**
 * Tracks `navigator.onLine`. Returns `true` when the browser believes the
 * device has network connectivity. Note: a `true` value does not guarantee
 * the API is reachable (e.g. behind captive portals); it only reflects the
 * OS-level link status.
 */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState<boolean>(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return online;
}
