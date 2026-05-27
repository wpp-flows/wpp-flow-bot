import { useState } from 'react';
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { Bell, CheckCheck, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { invalidateQueriesByFilters, queryKeys } from '@/lib/queryClient';
import { cn } from '@/lib/utils';
import { notificationService } from '@/services/notificationService';
import { toast } from '@/stores/uiStore';
import type { Notification } from '@/types';
import {
  TYPE_ICON,
  TYPE_ICON_TONE,
  TYPE_LABEL,
  formatRelative,
} from '../../helpers/notification-helpers';

export function NotificationsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  const query = useInfiniteQuery({
    queryKey: queryKeys.notifications.list,
    queryFn: ({ pageParam }) =>
      notificationService.list({ cursor: pageParam, limit: 25 }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

  const invalidateAll = () =>
    invalidateQueriesByFilters(qc, [
      { queryKey: queryKeys.notifications.recent },
      { queryKey: queryKeys.notifications.list },
    ]);

  const markRead = useMutation({
    mutationFn: notificationService.markRead,
    onSuccess: invalidateAll,
  });
  const markAll = useMutation({
    mutationFn: notificationService.markAllRead,
    onSuccess: () => {
      invalidateAll();
      toast.success('Todas marcadas como lidas');
    },
  });
  const clearAll = useMutation({
    mutationFn: notificationService.deleteAll,
    onSuccess: (result) => {
      invalidateAll();
      setConfirmClearOpen(false);
      toast.success(
        result.count > 0
          ? `${result.count} notificação${result.count === 1 ? '' : 'ões'} apagada${result.count === 1 ? '' : 's'}`
          : 'Nada para apagar',
      );
    },
    onError: (err) =>
      toast.error('Falha ao apagar', err instanceof Error ? err.message : undefined),
  });

  const items = query.data?.pages.flatMap((p) => p.items) ?? [];
  const hasAny = items.length > 0;

  const openNotification = (n: Notification) => {
    if (!n.readAt) markRead.mutate(n.id);
    if (n.link) navigate(n.link);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Notificações"
        description="Tudo que aconteceu na sua operação. Notificações marcadas como lidas são removidas automaticamente em 24 horas."
        actions={
          hasAny ? (
            <>
              <Button
                variant="outline"
                leftIcon={<CheckCheck />}
                loading={markAll.isPending}
                onClick={() => markAll.mutate()}
              >
                Marcar todas como lidas
              </Button>
              <Button
                variant="outline"
                leftIcon={<Trash2 />}
                className="text-destructive"
                onClick={() => setConfirmClearOpen(true)}
              >
                Limpar tudo
              </Button>
            </>
          ) : null
        }
      />

      {query.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : !hasAny ? (
        <EmptyState
          icon={<Bell />}
          title="Sem notificações"
          description="Quando chegarem pedidos, pagamentos ou alertas dos seus bots, você verá tudo por aqui."
        />
      ) : (
        <>
          <div className="space-y-2">
            {items.map((n) => (
              <NotificationRow
                key={n.id}
                notification={n}
                onOpen={() => openNotification(n)}
                onMarkRead={() => markRead.mutate(n.id)}
              />
            ))}
          </div>
          {query.hasNextPage ? (
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => query.fetchNextPage()}
                loading={query.isFetchingNextPage}
              >
                Carregar mais
              </Button>
            </div>
          ) : null}
        </>
      )}

      <Modal
        open={confirmClearOpen}
        onClose={() => setConfirmClearOpen(false)}
        title="Apagar todas as notificações?"
        description="Esta ação remove todo o histórico — lidas e não lidas — e não pode ser desfeita."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmClearOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              loading={clearAll.isPending}
              onClick={() => clearAll.mutate()}
            >
              Sim, apagar tudo
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          As notificações ficam armazenadas só para sua referência —
          mensagens, pedidos e pagamentos continuam intactos.
        </p>
      </Modal>
    </div>
  );
}

function NotificationRow({
  notification,
  onOpen,
  onMarkRead,
}: {
  notification: Notification;
  onOpen: () => void;
  onMarkRead: () => void;
}) {
  const Icon = TYPE_ICON[notification.type];
  const tone = TYPE_ICON_TONE[notification.type];
  const isUnread = !notification.readAt;
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-xl border bg-card p-4 transition',
        isUnread ? 'border-primary/40 bg-primary-soft/30' : 'border-border',
      )}
    >
      <span
        className={cn(
          'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md [&_svg]:h-4 [&_svg]:w-4',
          tone,
        )}
      >
        <Icon />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm font-semibold tracking-tight">{notification.title}</p>
          <span className="text-2xs text-muted-foreground">
            {formatRelative(notification.createdAt)}
          </span>
        </div>
        {notification.body ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{notification.body}</p>
        ) : null}
        <p className="mt-1 text-2xs text-muted-foreground">
          {TYPE_LABEL[notification.type]}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        {notification.link ? (
          <Button variant="ghost" size="sm" onClick={onOpen}>
            Abrir
          </Button>
        ) : null}
        {isUnread ? (
          <Button variant="ghost" size="sm" onClick={onMarkRead}>
            Marcar como lida
          </Button>
        ) : null}
      </div>
    </div>
  );
}
