import { Navigate, Route, Routes } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { ROUTES } from '@/constants/app';
import { AppShell } from '@/components/layout/AppShell';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { RedirectIfAuthenticated, RequireAuth } from '@/components/layout/RouteGuards';

const LoginPage = lazy(() => import('@/pages/login/LoginPage').then((m) => ({ default: m.LoginPage })));
const DashboardPage = lazy(() =>
  import('@/pages/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const BotsPage = lazy(() => import('@/pages/bots/BotsPage').then((m) => ({ default: m.BotsPage })));
const MenuPage = lazy(() => import('@/pages/menu/MenuPage').then((m) => ({ default: m.MenuPage })));
const FlowsPage = lazy(() => import('@/pages/flows/FlowsPage').then((m) => ({ default: m.FlowsPage })));
const ConversationsPage = lazy(() =>
  import('@/pages/conversations/ConversationsPage').then((m) => ({ default: m.ConversationsPage })),
);
const SettingsPage = lazy(() =>
  import('@/pages/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })),
);

function PageFallback() {
  return (
    <div className="flex h-[60vh] items-center justify-center">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted border-t-primary" />
    </div>
  );
}

export function AppRouter() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route element={<RedirectIfAuthenticated />}>
          <Route element={<AuthLayout />}>
            <Route path={ROUTES.login} element={<LoginPage />} />
          </Route>
        </Route>

        <Route element={<RequireAuth />}>
          <Route element={<AppShell />}>
            <Route path={ROUTES.dashboard} element={<DashboardPage />} />
            <Route path={ROUTES.bots} element={<BotsPage />} />
            <Route path={ROUTES.menu} element={<MenuPage />} />
            <Route path={ROUTES.flows} element={<FlowsPage />} />
            <Route path={ROUTES.conversations} element={<ConversationsPage />} />
            <Route path={ROUTES.settings} element={<SettingsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to={ROUTES.dashboard} replace />} />
      </Routes>
    </Suspense>
  );
}
