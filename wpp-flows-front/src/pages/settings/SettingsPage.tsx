import { Monitor, Moon, Sun } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { Switch } from '@/components/ui/Switch';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useThemeStore, type Theme } from '@/stores/themeStore';
import { cn } from '@/lib/utils';

const THEMES: { value: Theme; label: string; icon: React.ReactNode }[] = [
  { value: 'light', label: 'Light', icon: <Sun /> },
  { value: 'dark', label: 'Dark', icon: <Moon /> },
  { value: 'system', label: 'System', icon: <Monitor /> },
];

export function SettingsPage() {
  const { user, organization } = useAuth();
  const themeMode = useThemeStore((s) => s.theme);
  const { setTheme } = useTheme();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Settings" description="Manage your workspace, profile and appearance." />

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>This information is visible to your team.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-4">
            <Avatar size="lg" name={user?.name ?? ''} src={user?.image ?? undefined} />
            <div>
              <Button variant="outline" size="sm">
                Change avatar
              </Button>
              <p className="mt-1 text-2xs text-muted-foreground">PNG or JPG, up to 2MB.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Full name" htmlFor="settings-name">
              <Input id="settings-name" defaultValue={user?.name} />
            </FormField>
            <FormField label="Email" htmlFor="settings-email">
              <Input id="settings-email" type="email" defaultValue={user?.email} />
            </FormField>
            <FormField label="Restaurant name" htmlFor="settings-restaurant" className="sm:col-span-2">
              <Input id="settings-restaurant" defaultValue={organization?.name ?? ''} />
            </FormField>
          </div>
          <div className="flex justify-end">
            <Button>Save changes</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Pick the theme that fits your service hours.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {THEMES.map((t) => {
              const active = themeMode === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTheme(t.value)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg border bg-card p-4 text-left transition-all',
                    active
                      ? 'border-primary ring-2 ring-primary/20'
                      : 'border-border hover:border-foreground/20',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-md [&_svg]:h-4 [&_svg]:w-4',
                      active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {t.icon}
                  </span>
                  <div>
                    <p className="text-sm font-semibold tracking-tight">{t.label}</p>
                    <p className="text-2xs text-muted-foreground">
                      {t.value === 'system' ? 'Match your OS preference.' : `Use ${t.label.toLowerCase()} mode always.`}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Choose what triggers a desktop and email notification.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { id: 'orders', label: 'New orders', desc: 'Sound and toast when a new order arrives.' },
            { id: 'disconnect', label: 'Bot disconnections', desc: 'Get notified the moment a bot drops offline.' },
            { id: 'inactive', label: 'Inactive conversations', desc: 'Reminder if a customer has waited > 5 minutes.' },
          ].map((row, i) => (
            <div
              key={row.id}
              className="flex items-center justify-between rounded-md border border-border bg-muted/30 p-3"
            >
              <div>
                <p className="text-sm font-medium">{row.label}</p>
                <p className="text-2xs text-muted-foreground">{row.desc}</p>
              </div>
              <Switch defaultChecked={i !== 2} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
