import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { setAppTimezone } from '../shared/lib/date-utils';
import { API_BASE_URL } from '../shared/lib/env.js';

const ConfigContext = createContext<{ timezoneReady: boolean }>({ timezoneReady: false });

function getHealthUrl(): string {
  return API_BASE_URL ? `${API_BASE_URL.replace(/\/$/, '')}/health` : '/health';
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
