import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type RequestFamilyTab = () => void;

const HomeTabRequestContext = createContext<{ requestFamilyTab: RequestFamilyTab; requestId: number } | null>(null);

export function HomeTabRequestProvider({ children }: { children: ReactNode }) {
  const [requestId, setRequestId] = useState(0);
  const requestFamilyTab = useCallback(() => {
    setRequestId((n) => n + 1);
  }, []);
  return (
    <HomeTabRequestContext.Provider value={{ requestFamilyTab, requestId }}>
      {children}
    </HomeTabRequestContext.Provider>
  );
}

export function useHomeTabRequest() {
  const ctx = useContext(HomeTabRequestContext);
  return ctx;
}
