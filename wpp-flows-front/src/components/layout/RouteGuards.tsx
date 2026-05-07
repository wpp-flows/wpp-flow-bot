import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES } from '@/constants/app';
import { useAuthStore } from '@/stores/authStore';

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
    </div>
  );
}

export function RequireAuth() {
  const { isAuthenticated, status } = useAuth();
  const location = useLocation();
  const bootstrap = useAuthStore((s) => s.bootstrap);

  useEffect(() => {
    if (status === 'idle') void bootstrap();
  }, [status, bootstrap]);

  if (status === 'idle') return <LoadingScreen />;
  if (!isAuthenticated) {
    return <Navigate to={ROUTES.login} state={{ from: location }} replace />;
  }
  return <Outlet />;
}

export function RequireOrganization() {
  const { organization, status } = useAuth();
  if (status === 'idle') return <LoadingScreen />;
  if (!organization) return <Navigate to={ROUTES.onboarding} replace />;
  return <Outlet />;
}

export function RedirectIfAuthenticated() {
  const { isAuthenticated, organization, status } = useAuth();

  if (status === 'idle') return null;
  if (isAuthenticated) {
    return <Navigate to={organization ? ROUTES.dashboard : ROUTES.onboarding} replace />;
  }
  return <Outlet />;
}

export function RedirectIfHasOrganization() {
  const { organization, status, isAuthenticated } = useAuth();
  if (status === 'idle') return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to={ROUTES.login} replace />;
  if (organization) return <Navigate to={ROUTES.dashboard} replace />;
  return <Outlet />;
}
