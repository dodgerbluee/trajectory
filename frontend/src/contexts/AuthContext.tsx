import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiClientError } from '../lib/api-client';

export interface User {
  id: number;
  email: string;
  name: string;
  emailVerified?: boolean;
  createdAt?: string;
  lastLoginAt?: string | null;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  refreshToken: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateUsername: (newUsername: string, currentPassword: string) => Promise<void>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ACCESS_TOKEN_KEY = 'trajectory_access_token';
const REFRESH_TOKEN_KEY = 'trajectory_refresh_token';
const USER_KEY = 'trajectory_user';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ data: T }> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  const response = await fetch(url, config);
  const data = await response.json();

  if (!response.ok) {
    const error = data as { error: { message: string; type: string; statusCode: number } };
    throw new ApiClientError(
      error.error.message,
      error.error.statusCode,
      error.error.type
    );
  }

  return data as { data: T };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem(USER_KEY);
    return stored ? JSON.parse(stored) : null;
  });
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const getAccessToken = () => localStorage.getItem(ACCESS_TOKEN_KEY);
  const getRefreshToken = () => localStorage.getItem(REFRESH_TOKEN_KEY);

  const setTokens = (accessToken: string, refreshToken: string) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  };

  const clearTokens = () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  };

  const refreshToken = useCallback(async () => {
    const refreshTokenValue = getRefreshToken();
    if (!refreshTokenValue) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await apiRequest<{ accessToken: string; refreshToken: string }>(
        '/api/auth/refresh',
        {
          method: 'POST',
          body: JSON.stringify({ refreshToken: refreshTokenValue }),
        }
      );

      setTokens(response.data.accessToken, response.data.refreshToken);
    } catch (error) {
      // Refresh failed, clear tokens and user
      clearTokens();
      setUser(null);
      throw error;
    }
  }, []);

  const checkAuth = useCallback(async () => {
    const accessToken = getAccessToken();
    if (!accessToken) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await apiRequest<User>(
        '/api/auth/me',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      setUser(response.data);
      localStorage.setItem(USER_KEY, JSON.stringify(response.data));
    } catch (error) {
      // Token might be expired, try to refresh
      if (error instanceof ApiClientError && error.statusCode === 401) {
        try {
          await refreshToken();
          // Retry getting user info
          const retryResponse = await apiRequest<User>(
            '/api/auth/me',
            {
              headers: {
                Authorization: `Bearer ${getAccessToken()}`,
              },
            }
          );
          setUser(retryResponse.data);
          localStorage.setItem(USER_KEY, JSON.stringify(retryResponse.data));
        } catch (refreshError) {
          // Refresh also failed, clear everything
          clearTokens();
          setUser(null);
        }
      } else {
        clearTokens();
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, [refreshToken]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email: string, password: string) => {
    const response = await apiRequest<{
      user: User;
      accessToken: string;
      refreshToken: string;
    }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    setTokens(response.data.accessToken, response.data.refreshToken);
    setUser(response.data.user);
    localStorage.setItem(USER_KEY, JSON.stringify(response.data.user));
  };

  const register = async (email: string, password: string, name: string) => {
    const response = await apiRequest<{
      user: User;
      accessToken: string;
      refreshToken: string;
    }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });

    setTokens(response.data.accessToken, response.data.refreshToken);
    setUser(response.data.user);
    localStorage.setItem(USER_KEY, JSON.stringify(response.data.user));
  };

  const logout = async () => {
    const refreshTokenValue = getRefreshToken();
    
    try {
      if (refreshTokenValue) {
        await apiRequest('/api/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken: refreshTokenValue }),
        });
      }
    } catch (error) {
      // Ignore logout errors, still clear local state
    } finally {
      clearTokens();
      setUser(null);
      navigate('/login');
    }
  };

  const updateUsername = async (newUsername: string, currentPassword: string) => {
    const accessToken = getAccessToken();
    if (!accessToken) {
      throw new Error('Not authenticated');
    }

    await apiRequest('/api/auth/update-username', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ newUsername, currentPassword }),
    });

    // Refresh user data
    await checkAuth();
  };

  const updatePassword = async (currentPassword: string, newPassword: string) => {
    const accessToken = getAccessToken();
    if (!accessToken) {
      throw new Error('Not authenticated');
    }

    await apiRequest('/api/auth/update-password', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    // Password change invalidates sessions, so we need to re-login
    // Clear tokens and redirect to login
    clearTokens();
    setUser(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        register,
        refreshToken,
        checkAuth,
        updateUsername,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
