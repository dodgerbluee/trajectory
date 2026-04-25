import { useEffect, useState } from 'react';
import { API_BASE_URL } from '@lib/env.js';

export interface SSOProvider {
  name: string;
  displayName: string;
}

interface ProvidersResponse {
  data: {
    providers: SSOProvider[];
    allowLocalLogin: boolean;
  };
}

export interface SSOProvidersState {
  providers: SSOProvider[];
  allowLocalLogin: boolean;
  loading: boolean;
}

export function useSSOProviders(): SSOProvidersState {
  const [providers, setProviders] = useState<SSOProvider[]>([]);
  const [allowLocalLogin, setAllowLocalLogin] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch(`${API_BASE_URL}/api/auth/oauth/providers`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return (await r.json()) as ProvidersResponse;
      })
      .then((body) => {
        if (!active) return;
        setProviders(body.data.providers ?? []);
        setAllowLocalLogin(body.data.allowLocalLogin ?? true);
      })
      .catch(() => {
        if (!active) return;
        setProviders([]);
        setAllowLocalLogin(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return { providers, allowLocalLogin, loading };
}
