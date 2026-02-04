import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import { preferencesApi } from '../shared/lib/api-client';
import { setDateFormat as setDateFormatInUtils, type DateFormat } from '../shared/lib/date-utils';

export type ThemePreference = 'light' | 'dark' | 'system';

interface PreferencesContextType {
  theme: ThemePreference;
  dateFormat: DateFormat;
  setTheme: (theme: ThemePreference) => void;
  setDateFormat: (format: DateFormat) => void;
  isLoading: boolean;
}

const DEFAULT_THEME: ThemePreference = 'system';
const DEFAULT_DATE_FORMAT: DateFormat = 'MM/DD/YYYY';

const STORAGE_THEME = 'theme';
const STORAGE_DATE_FORMAT = 'dateFormat';

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

function parseTheme(v: string): ThemePreference {
  if (v === 'light' || v === 'dark' || v === 'system') return v;
  return DEFAULT_THEME;
}

function parseDateFormat(v: string): DateFormat {
  if (v === 'MM/DD/YYYY' || v === 'DD/MM/YYYY' || v === 'YYYY-MM-DD') return v;
  return DEFAULT_DATE_FORMAT;
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [theme, setThemeState] = useState<ThemePreference>(() =>
    parseTheme(localStorage.getItem(STORAGE_THEME) ?? DEFAULT_THEME)
  );
  const [dateFormat, setDateFormatState] = useState<DateFormat>(() =>
    parseDateFormat(localStorage.getItem(STORAGE_DATE_FORMAT) ?? DEFAULT_DATE_FORMAT)
  );
  const [isLoading, setIsLoading] = useState(!!user);

  // When logged in, fetch preferences and sync to date-utils
  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      setDateFormatInUtils(dateFormat);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    preferencesApi
      .get()
      .then((res) => {
        if (cancelled) return;
        const t = parseTheme(res.data.theme);
        const df = parseDateFormat(res.data.date_format);
        setThemeState(t);
        setDateFormatState(df);
        setDateFormatInUtils(df);
      })
      .catch(() => {
        if (!cancelled) setDateFormatInUtils(dateFormat);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps -- only refetch when user identity changes

  // Keep date-utils in sync whenever dateFormat changes (e.g. from Settings)
  useEffect(() => {
    setDateFormatInUtils(dateFormat);
  }, [dateFormat]);

  const setTheme = useCallback(
    (newTheme: ThemePreference) => {
      setThemeState(newTheme);
      localStorage.setItem(STORAGE_THEME, newTheme);
      if (user) {
        preferencesApi.update({ theme: newTheme }).catch(() => {});
      }
    },
    [user]
  );

  const setDateFormat = useCallback(
    (newFormat: DateFormat) => {
      setDateFormatState(newFormat);
      setDateFormatInUtils(newFormat);
      localStorage.setItem(STORAGE_DATE_FORMAT, newFormat);
      if (user) {
        preferencesApi.update({ date_format: newFormat }).catch(() => {});
      }
    },
    [user]
  );

  return (
    <PreferencesContext.Provider
      value={{ theme, dateFormat, setTheme, setDateFormat, isLoading }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (context === undefined) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
}
