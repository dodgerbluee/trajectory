import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@shared/components/LoadingSpinner';

interface AdminRouteProps {
  children: ReactNode;
}

/**
 * Wraps admin-only content. Redirects to /settings if user is not an instance admin.
 */
export default function AdminRoute({ children }: AdminRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner message="Checking access..." />;
  }

  if (!user?.isInstanceAdmin) {
    return <Navigate to="/settings" replace />;
  }

  return <>{children}</>;
}
