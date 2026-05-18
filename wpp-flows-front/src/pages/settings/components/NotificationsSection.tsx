import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Switch } from '@/components/ui/Switch';
import { authService } from '@/services/authService';
import { toast } from '@/stores/uiStore';
import type { NotificationPreferences, Organization } from '@/types';
import { NOTIFICATION_ROWS } from '../settings-constants';

interface Props {
  organization: Organization | null;
  onUpdated: () => Promise<void> | void;
}

export function NotificationsSection({ organization, onUpdated }: Props) {
  const prefs = organization?.notificationPreferences;

  const toggle = useMutation({
    mutationFn: (next: NotificationPreferences) =>
      authService.updateOrganization({ notificationPreferences: next }),
    onSuccess: async () => {
      await onUpdated();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Falha ao salvar'),
  });

  const update = (key: keyof NotificationPreferences, value: boolean) => {
    if (!prefs) return;
    toggle.mutate({ ...prefs, [key]: value });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notificações</CardTitle>
        <CardDescription>
          Escolha o que dispara notificações no desktop. As alterações são salvas automaticamente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {NOTIFICATION_ROWS.map((row) => (
          <div
            key={row.key}
            className="flex items-center justify-between rounded-md border border-border bg-muted/30 p-3"
          >
            <div>
              <p className="text-sm font-medium">{row.label}</p>
              <p className="text-2xs text-muted-foreground">{row.desc}</p>
            </div>
            <Switch
              checked={prefs?.[row.key] ?? false}
              disabled={!prefs || toggle.isPending}
              onChange={(e) => update(row.key, e.target.checked)}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
