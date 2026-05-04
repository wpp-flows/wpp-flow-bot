import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MoreVertical, Power, Trash2, RefreshCw, Phone, Hash } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/feedback/StatusBadge';
import { botService } from '@/services/botService';
import { queryKeys } from '@/lib/queryClient';
import { toast } from '@/stores/uiStore';
import { formatRelativeTime, cn } from '@/lib/utils';
import type { BotInstance } from '@/types';

export function BotCard({ bot }: { bot: BotInstance }) {
  const qc = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const refresh = () => qc.invalidateQueries({ queryKey: queryKeys.bots.all });

  const connect = useMutation({
    mutationFn: () => botService.connect(bot.id),
    onSuccess: () => {
      refresh();
      toast.success(`${bot.name} is online`);
    },
    onError: () => toast.error('Could not connect'),
  });

  const disconnect = useMutation({
    mutationFn: () => botService.disconnect(bot.id),
    onSuccess: () => {
      refresh();
      toast.info(`${bot.name} disconnected`);
    },
  });

  const remove = useMutation({
    mutationFn: () => botService.remove(bot.id),
    onSuccess: () => {
      refresh();
      toast.success('Bot deleted', `${bot.name} was removed.`);
      setConfirmDelete(false);
    },
  });

  const isOnline = bot.status === 'online';

  return (
    <>
      <Card className="group relative overflow-hidden transition-shadow hover:shadow-soft-md">
        <CardContent className="space-y-4 p-5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-3">
              <span
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-lg text-base font-semibold tracking-tight',
                  isOnline ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                )}
              >
                {bot.name.charAt(0)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold tracking-tight">{bot.name}</p>
                <p className="truncate text-2xs text-muted-foreground font-mono">{bot.id}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <StatusBadge status={bot.status} size="sm" />
              <div className="relative">
                <IconButton
                  size="sm"
                  variant="ghost"
                  onClick={() => setMenuOpen((v) => !v)}
                  onBlur={() => setTimeout(() => setMenuOpen(false), 150)}
                  aria-label="Bot actions"
                >
                  <MoreVertical />
                </IconButton>
                <div
                  className={cn(
                    'absolute right-0 top-full z-10 mt-1 w-44 rounded-lg border border-border bg-popover p-1 shadow-soft-md',
                    'origin-top-right transition-all duration-150',
                    menuOpen ? 'opacity-100 scale-100' : 'pointer-events-none opacity-0 scale-95',
                  )}
                >
                  <button
                    type="button"
                    onMouseDown={() => (isOnline ? disconnect.mutate() : connect.mutate())}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium hover:bg-muted"
                  >
                    <Power className="h-3.5 w-3.5" />
                    {isOnline ? 'Disconnect' : 'Connect'}
                  </button>
                  <button
                    type="button"
                    onMouseDown={() => refresh()}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium hover:bg-muted"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Refresh status
                  </button>
                  <button
                    type="button"
                    onMouseDown={() => setConfirmDelete(true)}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive-soft"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete bot
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat label="Conversations" value={bot.metrics.conversations.toLocaleString()} />
            <Stat label="Active" value={bot.metrics.activeChats.toString()} />
            <Stat label="Orders today" value={bot.metrics.ordersToday.toString()} />
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-3 w-3" />
              <span className="font-mono">{bot.phoneNumber ?? 'Unassigned'}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Hash className="h-3 w-3" />
              <span>
                {bot.lastConnectedAt
                  ? `Last connected ${formatRelativeTime(bot.lastConnectedAt)}`
                  : 'Never connected'}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            {isOnline ? (
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => disconnect.mutate()}
                loading={disconnect.isPending}
              >
                Disconnect
              </Button>
            ) : (
              <Button
                size="sm"
                className="flex-1"
                onClick={() => connect.mutate()}
                loading={connect.isPending}
              >
                Connect
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete this bot?"
        description={`${bot.name} will be permanently removed and conversations archived.`}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => remove.mutate()} loading={remove.isPending}>
              Yes, delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          This action cannot be undone. The Evolution API instance will also be terminated.
        </p>
      </Modal>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted/40 p-2">
      <p className="text-base font-semibold tracking-tight">{value}</p>
      <p className="text-2xs uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}
