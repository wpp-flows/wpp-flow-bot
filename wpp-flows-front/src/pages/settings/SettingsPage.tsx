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
  { value: 'light', label: 'Claro', icon: <Sun /> },
  { value: 'dark', label: 'Escuro', icon: <Moon /> },
  { value: 'system', label: 'Sistema', icon: <Monitor /> },
];

export function SettingsPage() {
  const { user, organization } = useAuth();
  const themeMode = useThemeStore((s) => s.theme);
  const { setTheme } = useTheme();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Configuracoes" description="Gerencie seu espaco de trabalho, perfil e aparencia." />

      <Card>
        <CardHeader>
          <CardTitle>Perfil</CardTitle>
          <CardDescription>Estas informacoes sao visiveis para sua equipe.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-4">
            <Avatar size="lg" name={user?.name ?? ''} src={user?.image ?? undefined} />
            <div>
              <Button variant="outline" size="sm">
                Trocar avatar
              </Button>
              <p className="mt-1 text-2xs text-muted-foreground">PNG ou JPG, ate 2MB.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Nome completo" htmlFor="settings-name">
              <Input id="settings-name" defaultValue={user?.name} />
            </FormField>
            <FormField label="Email" htmlFor="settings-email">
              <Input id="settings-email" type="email" defaultValue={user?.email} />
            </FormField>
            <FormField label="Nome do restaurante" htmlFor="settings-restaurant" className="sm:col-span-2">
              <Input id="settings-restaurant" defaultValue={organization?.name ?? ''} />
            </FormField>
          </div>
          <div className="flex justify-end">
            <Button>Salvar alteracoes</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Aparencia</CardTitle>
          <CardDescription>Escolha o tema que combina com seu horario de atendimento.</CardDescription>
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
                      {t.value === 'system' ? 'Siga a preferencia do sistema.' : `Use sempre o modo ${t.label.toLowerCase()}.`}
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
          <CardTitle>Notificacoes</CardTitle>
          <CardDescription>Escolha o que dispara notificacoes no desktop e por email.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { id: 'orders', label: 'Novos pedidos', desc: 'Som e aviso quando um novo pedido chega.' },
            { id: 'disconnect', label: 'Desconexoes do bot', desc: 'Receba alerta quando um bot ficar offline.' },
            { id: 'inactive', label: 'Conversas inativas', desc: 'Lembrete se um cliente esperar > 5 minutos.' },
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
