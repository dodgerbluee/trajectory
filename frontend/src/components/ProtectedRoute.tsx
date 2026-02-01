import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingSpinner message="Checking authentication..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const fromInvite = (location.state as { fromInvite?: boolean } | null)?.fromInvite === true;
  const fromOnboarding =
    (location.state as { fromOnboarding?: boolean } | null)?.fromOnboarding === true;
  const allowedDuringOnboarding = location.pathname === '/children/new' && fromOnboarding;
  const needsOnboarding =
    user &&
    user.onboardingCompleted === false &&
    location.pathname !== '/welcome' &&
    !fromInvite &&
    !allowedDuringOnboarding;
  if (needsOnboarding) {
    return <Navigate to="/welcome" replace />;
  }

  return <>{children}</>;
}
