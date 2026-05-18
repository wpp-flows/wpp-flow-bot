import { PageHeader } from '@/components/layout/PageHeader';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';
import { AppearanceSection } from './components/AppearanceSection';
import { MercadoPagoSection } from './components/MercadoPagoSection';
import { NotificationsSection } from './components/NotificationsSection';
import { PayoutSection } from './components/PayoutSection';
import { ProfileSection } from './components/ProfileSection';

export function SettingsPage() {
  const { user, organization } = useAuth();
  const themeMode = useThemeStore((s) => s.theme);
  const { setTheme } = useTheme();
  const refreshOrganization = useAuthStore((s) => s.refreshOrganization);
  const refreshUser = useAuthStore((s) => s.refreshUser);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Configurações"
        description="Gerencie seu espaço de trabalho, pagamentos e preferências."
      />

      <ProfileSection
        user={user}
        organization={organization}
        onUpdated={async () => {
          await Promise.all([refreshUser(), refreshOrganization()]);
        }}
      />
      <MercadoPagoSection organization={organization} onUpdated={refreshOrganization} />
      <PayoutSection organization={organization} onUpdated={refreshOrganization} />
      <AppearanceSection themeMode={themeMode} setTheme={setTheme} />
      <NotificationsSection organization={organization} onUpdated={refreshOrganization} />
    </div>
  );
}
