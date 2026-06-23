import { Activity, Phone, RefreshCw, Zap } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/feedback/StatusBadge';
import { QrPlaceholder } from './QrPlaceholder';
import type { BotInstance } from '@/types';
import { botService } from '@/services/botService';
import { invalidateQueriesByFilters, queryKeys } from '@/lib/queryClient';
import { toast } from '@/stores/uiStore';
import { formatRelativeTime } from '@/lib/utils';

export function BotStatusCard({ bot }: { bot: BotInstance }) {
  const qc = useQueryClient();

  const connect = useMutation({
    mutationFn: () => botService.connect(bot.id),
    onSuccess: () => {
      void invalidateQueriesByFilters(qc, [{ queryKey: queryKeys.bots.all }]);
      toast.success(`${bot.name} esta online`, 'A instancia do WhatsApp agora esta conectada.');
    },
    onError: () => toast.error('Nao foi possivel conectar', 'Tente novamente ou verifique a URL do webhook.'),
  });

  const disconnect = useMutation({
    mutationFn: () => botService.disconnect(bot.id),
    onSuccess: () => {
      void invalidateQueriesByFilters(qc, [{ queryKey: queryKeys.bots.all }]);
      toast.info(`${bot.name} desconectado`);
    },
  });

  const isOnline = bot.status === 'ONLINE';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>{bot.name}</CardTitle>
            <CardDescription>
              <span className="font-mono text-2xs uppercase tracking-wider">{bot.id}</span>
            </CardDescription>
          </div>
          <StatusBadge status={bot.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <Row icon={<Phone />} label="Telefone" value={bot.phoneNumber ?? '—'} mono />
          <Row
            icon={<Activity />}
            label="Última conexão"
            value={bot.lastConnectedAt ? formatRelativeTime(bot.lastConnectedAt) : 'Nunca'}
          />
          <Row icon={<Zap />} label="Status" value={bot.status} />
          <Row
            icon={<RefreshCw />}
            label="Instancia"
            value={bot.evolutionInstanceName}
            mono
          />
        </div>

        {!isOnline && bot.qrCode ? (
          <div className="grid gap-4 rounded-lg border border-dashed border-border bg-muted/30 p-4 sm:grid-cols-[160px_1fr]">
            <QrPlaceholder seed={bot.id} />
            <div className="flex flex-col justify-between gap-3">
              <div className="space-y-1.5">
                <h4 className="text-sm font-semibold tracking-tight">Escaneie para vincular o WhatsApp</h4>
                <p className="text-xs text-muted-foreground text-pretty">
                  Abra o WhatsApp no seu telefone, va em Configuracoes &rarr; Dispositivos conectados e escaneie este codigo para colocar seu bot online.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => connect.mutate()}
                loading={connect.isPending}
              >
                Ja escaneei — conectar agora
              </Button>
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {isOnline ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => disconnect.mutate()}
              loading={disconnect.isPending}
            >
              Desconectar
            </Button>
          ) : (
            <Button size="sm" onClick={() => connect.mutate()} loading={connect.isPending}>
              Conectar
            </Button>
          )}
          <Button variant="ghost" size="sm">
            Ver logs
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Row({
  icon,
  label,
  value,
  mono,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-md border border-border/60 bg-muted/30 px-3 py-2">
      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-background text-muted-foreground [&_svg]:h-3.5 [&_svg]:w-3.5 ring-1 ring-border">
        {icon}
      </span>
      <div className="flex min-w-0 flex-1 flex-col leading-tight">
        <span className="text-2xs uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className={mono ? 'font-mono text-xs' : 'text-xs font-medium text-foreground'}>
          {value}
        </span>
      </div>
    </div>
  );
}
