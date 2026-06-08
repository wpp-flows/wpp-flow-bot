import { Navigate, Route, Routes } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { ROUTES } from '@/constants/app';
import { AppShell } from '@/components/layout/AppShell';
import { AdminShell } from '@/components/layout/AdminShell';
import { AuthLayout } from '@/components/layout/AuthLayout';
import {
  RedirectIfAuthenticated,
  RedirectIfHasOrganization,
  RequireAdmin,
  RequireAuth,
  RequireOrganization,
} from '@/components/layout/RouteGuards';

const LoginPage = lazy(() => import('@/pages/login/LoginPage').then((m) => ({ default: m.LoginPage })));
const SignUpPage = lazy(() =>
  import('@/pages/sign-up/SignUpPage').then((m) => ({ default: m.SignUpPage })),
);
const OnboardingPage = lazy(() =>
  import('@/pages/onboarding/OnboardingPage').then((m) => ({ default: m.OnboardingPage })),
);
const DashboardPage = lazy(() =>
  import('@/pages/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const BotsPage = lazy(() => import('@/pages/bots/BotsPage').then((m) => ({ default: m.BotsPage })));
const MenuPage = lazy(() => import('@/pages/menu/MenuPage').then((m) => ({ default: m.MenuPage })));
const FlowsPage = lazy(() => import('@/pages/flows/FlowsPage').then((m) => ({ default: m.FlowsPage })));
const ConversationsPage = lazy(() =>
  import('@/pages/conversations/ConversationsPage').then((m) => ({ default: m.ConversationsPage })),
);
const OrdersPage = lazy(() =>
  import('@/pages/orders/OrdersPage').then((m) => ({ default: m.OrdersPage })),
);
const WalletPage = lazy(() =>
  import('@/pages/wallet/WalletPage').then((m) => ({ default: m.WalletPage })),
);
const PromotionsPage = lazy(() =>
  import('@/pages/promotions/PromotionsPage').then((m) => ({ default: m.PromotionsPage })),
);
const CouponsPage = lazy(() =>
  import('@/pages/coupons/CouponsPage').then((m) => ({ default: m.CouponsPage })),
);
const MenuPreviewPage = lazy(() =>
  import('@/pages/menu-preview/MenuPreviewPage').then((m) => ({
    default: m.MenuPreviewPage,
  })),
);
const MessagesPage = lazy(() =>
  import('@/pages/messages/MessagesPage').then((m) => ({ default: m.MessagesPage })),
);
const NotificationsPage = lazy(() =>
  import('@/pages/notifications/NotificationsPage').then((m) => ({ default: m.NotificationsPage })),
);
const SettingsPage = lazy(() =>
  import('@/pages/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })),
);
const PrivacyPage = lazy(() =>
  import('@/pages/legal/PrivacyPage').then((m) => ({ default: m.PrivacyPage })),
);
const TermsPage = lazy(() =>
  import('@/pages/legal/TermsPage').then((m) => ({ default: m.TermsPage })),
);
const PublicMenuPage = lazy(() =>
  import('@/pages/public-menu/PublicMenuPage').then((m) => ({ default: m.PublicMenuPage })),
);
const PublicCartPage = lazy(() =>
  import('@/pages/public-menu/PublicCartPage').then((m) => ({ default: m.PublicCartPage })),
);
const PublicCheckoutPage = lazy(() =>
  import('@/pages/public-menu/PublicCheckoutPage').then((m) => ({
    default: m.PublicCheckoutPage,
  })),
);
const PublicOrderSuccessPage = lazy(() =>
  import('@/pages/public-menu/PublicOrderSuccessPage').then((m) => ({
    default: m.PublicOrderSuccessPage,
  })),
);
const AdminInvitationsPage = lazy(() =>
  import('@/pages/admin/InvitationsPage').then((m) => ({
    default: m.InvitationsPage,
  })),
);
const LocalTablesPage = lazy(() =>
  import('@/pages/local/LocalTablesPage').then((m) => ({
    default: m.LocalTablesPage,
  })),
);
const LocalTableDetailPage = lazy(() =>
  import('@/pages/local/LocalTableDetailPage').then((m) => ({
    default: m.LocalTableDetailPage,
  })),
);
const LocalOrdersPage = lazy(() =>
  import('@/pages/local/LocalOrdersPage').then((m) => ({
    default: m.LocalOrdersPage,
  })),
);
const LocalWalletPage = lazy(() =>
  import('@/pages/local/LocalWalletPage').then((m) => ({
    default: m.LocalWalletPage,
  })),
);
const LocalSettingsPage = lazy(() =>
  import('@/pages/local/LocalSettingsPage').then((m) => ({
    default: m.LocalSettingsPage,
  })),
);
const PublicTableMenuPage = lazy(() =>
  import('@/pages/public-menu/PublicTableMenuPage').then((m) => ({
    default: m.PublicTableMenuPage,
  })),
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
        <Route path={ROUTES.privacy} element={<PrivacyPage />} />
        <Route path={ROUTES.terms} element={<TermsPage />} />

        <Route path="/r/mesa/:token" element={<PublicTableMenuPage />} />
        <Route path="/r/:slug" element={<PublicMenuPage />} />
        <Route path="/r/:slug/carrinho" element={<PublicCartPage />} />
        <Route path="/r/:slug/checkout" element={<PublicCheckoutPage />} />
        <Route path="/r/:slug/pedido/:orderId" element={<PublicOrderSuccessPage />} />

        <Route element={<RedirectIfAuthenticated />}>
          <Route element={<AuthLayout />}>
            <Route path={ROUTES.login} element={<LoginPage />} />
            <Route path={ROUTES.signUp} element={<SignUpPage />} />
          </Route>
        </Route>

        <Route element={<RedirectIfHasOrganization />}>
          <Route element={<AuthLayout />}>
            <Route path={ROUTES.onboarding} element={<OnboardingPage />} />
          </Route>
        </Route>

        <Route element={<RequireAuth />}>
          <Route element={<RequireAdmin />}>
            <Route element={<AdminShell />}>
              <Route
                path={ROUTES.admin}
                element={<Navigate to={ROUTES.adminInvitations} replace />}
              />
              <Route
                path={ROUTES.adminInvitations}
                element={<AdminInvitationsPage />}
              />
            </Route>
          </Route>
        </Route>

        <Route element={<RequireAuth />}>
          <Route element={<RequireOrganization />}>
            <Route element={<AppShell />}>
              <Route path={ROUTES.dashboard} element={<DashboardPage />} />
              <Route path={ROUTES.bots} element={<BotsPage />} />
              <Route path={ROUTES.menu} element={<MenuPage />} />
              <Route path={ROUTES.flows} element={<FlowsPage />} />
              <Route path={ROUTES.conversations} element={<ConversationsPage />} />
              <Route path={ROUTES.orders} element={<OrdersPage />} />
              <Route path={ROUTES.wallet} element={<WalletPage />} />
              <Route path={ROUTES.promotions} element={<PromotionsPage />} />
              <Route path={ROUTES.coupons} element={<CouponsPage />} />
              <Route path={ROUTES.menuPreview} element={<MenuPreviewPage />} />
              <Route path={ROUTES.messages} element={<MessagesPage />} />
              <Route path={ROUTES.notifications} element={<NotificationsPage />} />
              <Route path={ROUTES.settings} element={<SettingsPage />} />

              <Route
                path={ROUTES.local}
                element={<Navigate to={ROUTES.localTables} replace />}
              />
              <Route path={ROUTES.localTables} element={<LocalTablesPage />} />
              <Route
                path={ROUTES.localTableDetail()}
                element={<LocalTableDetailPage />}
              />
              <Route path={ROUTES.localOrders} element={<LocalOrdersPage />} />
              <Route path={ROUTES.localWallet} element={<LocalWalletPage />} />
              <Route
                path={ROUTES.localSettings}
                element={<LocalSettingsPage />}
              />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to={ROUTES.dashboard} replace />} />
      </Routes>
    </Suspense>
  );
}
