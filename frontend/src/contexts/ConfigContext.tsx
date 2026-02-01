import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { setAppTimezone } from '../lib/date-utils';

const ConfigContext = createContext<{ timezoneReady: boolean }>({ timezoneReady: false });

function getHealthUrl(): string {
  const base = import.meta.env.VITE_API_URL || '';
  return base ? `${base.replace(/\/$/, '')}/health` : '/health';
}

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [timezoneReady, setTimezoneReady] = useState(false);

  useEffect(() => {
    fetch(getHealthUrl())
      .then((res) => (res.ok ? res.json() : {}))
      .then((data: { timezone?: string }) => {
        setAppTimezone(data?.timezone || 'UTC');
        setTimezoneReady(true);
      })
      .catch(() => {
        setAppTimezone('UTC');
        setTimezoneReady(true);
      });
  }, []);

  return (
    <ConfigContext.Provider value={{ timezoneReady }}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  return useContext(ConfigContext);
}
