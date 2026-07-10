import { Activity, Phone, RefreshCw, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { StatusBadge } from '@/components/feedback/StatusBadge';
import type { BotInstance } from '@/types';
import { formatRelativeTime } from '@/lib/utils';

export function BotStatusCard({ bot }: { bot: BotInstance }) {
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
          <Row
            icon={<Phone />}
            label="Telefone"
            value={bot.displayPhoneNumber ?? bot.phoneNumber ?? '—'}
            mono
          />
          <Row
            icon={<Activity />}
            label="Última conexão"
            value={bot.lastConnectedAt ? formatRelativeTime(bot.lastConnectedAt) : 'Nunca'}
          />
          <Row icon={<Zap />} label="Status" value={bot.status} />
          <Row
            icon={<RefreshCw />}
            label="Conta WhatsApp"
            value={bot.verifiedName ?? bot.displayPhoneNumber ?? '—'}
            mono
          />
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
