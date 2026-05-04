import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES } from '@/constants/app';
import { useAuthStore } from '@/stores/authStore';

export function RequireAuth() {
  const { isAuthenticated, status } = useAuth();
  const location = useLocation();
  const bootstrap = useAuthStore((s) => s.bootstrap);

  useEffect(() => {
    if (status === 'idle') bootstrap();
  }, [status, bootstrap]);

  if (status === 'idle') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.login} state={{ from: location }} replace />;
  }

  return <Outlet />;
}

export function RedirectIfAuthenticated() {
  const { isAuthenticated, status } = useAuth();

  if (status === 'idle') return null;
  if (isAuthenticated) return <Navigate to={ROUTES.dashboard} replace />;

  return <Outlet />;
}
