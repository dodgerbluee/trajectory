import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { familiesApi } from '../lib/api-client';

interface FamilyPermissionsContextType {
  /** True if the user is owner or parent in at least one family; false for view-only. */
  canEdit: boolean;
  /** True while family list is being loaded. */
  isLoading: boolean;
  /** Refetch family list and recompute canEdit (e.g. after current user's role changed). */
  refreshPermissions: () => Promise<void>;
}

const FamilyPermissionsContext = createContext<FamilyPermissionsContextType | undefined>(undefined);

function computeCanEdit(roles: (string | undefined)[]): boolean {
  return roles.some((r) => r === 'owner' || r === 'parent');
}

export function FamilyPermissionsProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [canEdit, setCanEdit] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPermissions = useCallback(async () => {
    if (!user?.id) {
      setCanEdit(true);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const res = await familiesApi.getAll();
      setCanEdit(computeCanEdit(res.data.map((f) => f.role)));
    } catch {
      setCanEdit(true);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setCanEdit(true);
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    familiesApi
      .getAll()
      .then((res) => {
        if (cancelled) return;
        setCanEdit(computeCanEdit(res.data.map((f) => f.role)));
      })
      .catch(() => {
        if (!cancelled) setCanEdit(true);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.id]);

  const refreshPermissions = useCallback(async () => {
    if (!isAuthenticated || !user) return;
    await fetchPermissions();
  }, [isAuthenticated, user, fetchPermissions]);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    const onFocus = () => {
      fetchPermissions();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [isAuthenticated, user, fetchPermissions]);

  return (
    <FamilyPermissionsContext.Provider value={{ canEdit, isLoading, refreshPermissions }}>
      {children}
    </FamilyPermissionsContext.Provider>
  );
}

export function useFamilyPermissions(): FamilyPermissionsContextType {
  const ctx = useContext(FamilyPermissionsContext);
  if (ctx === undefined) {
    return { canEdit: true, isLoading: false, refreshPermissions: () => Promise.resolve() };
  }
  return ctx;
}
