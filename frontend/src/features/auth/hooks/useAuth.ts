import { useCallback } from 'react';
import { useAuth as useAuthContext } from '../../../contexts/AuthContext';

export function useAuth() {
  const { login, register, logout, isAuthenticated, user, isLoading } = useAuthContext();

  const handleLogin = useCallback(
    async (username: string, password: string) => {
      return login(username, password);
    },
    [login]
  );

  const handleRegister = useCallback(
    async (email: string, password: string, username: string) => {
      return register(email, password, username);
    },
    [register]
  );

  const handleLogout = useCallback(() => {
    logout();
  }, [logout]);

  return {
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    isAuthenticated,
    user,
    isLoading,
  };
}
