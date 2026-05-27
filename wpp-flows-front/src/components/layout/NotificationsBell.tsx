import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { IconButton } from '@/components/ui/IconButton';
import { invalidateQueriesByFilters, queryKeys } from '@/lib/queryClient';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/constants/app';
import { notificationService } from '@/services/notificationService';
import type { Notification } from '@/types';
import {
  TYPE_ICON,
  TYPE_ICON_TONE,
  TYPE_LABEL,
  formatRelative,
} from '@/helpers/notification-helpers';

const POLL_MS = 60_000;

export function NotificationsBell() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const recentQ = useQuery({
    queryKey: queryKeys.notifications.recent,
    queryFn: notificationService.recent,
    refetchInterval: POLL_MS,
    staleTime: 30_000,
  });

  const markRead = useMutation({
    mutationFn: notificationService.markRead,
    onSuccess: () =>
      invalidateQueriesByFilters(qc, [
        { queryKey: queryKeys.notifications.recent },
        { queryKey: queryKeys.notifications.list },
      ]),
  });

  const markAll = useMutation({
    mutationFn: notificationService.markAllRead,
    onSuccess: () =>
      invalidateQueriesByFilters(qc, [
        { queryKey: queryKeys.notifications.recent },
        { queryKey: queryKeys.notifications.list },
      ]),
  });

  const items = recentQ.data?.items ?? [];
  const unread = recentQ.data?.unread ?? 0;

  const openNotification = (n: Notification) => {
    if (!n.readAt) markRead.mutate(n.id);
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  return (
    <div className="relative" ref={containerRef}>
      <IconButton
        variant="ghost"
        size="md"
        aria-label="Notificações"
        onClick={() => setOpen((v) => !v)}
      >
        <Bell />
        {unread > 0 ? (
          <span
            aria-hidden
            className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-2xs font-semibold text-destructive-foreground"
          >
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </IconButton>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-soft-lg">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <p className="text-sm font-semibold tracking-tight">Notificações</p>
            {unread > 0 ? (
              <button
                type="button"
                onClick={() => markAll.mutate()}
                disabled={markAll.isPending}
                className="text-xs font-medium text-primary underline-offset-4 hover:underline disabled:opacity-50"
              >
                Marcar todas como lidas
              </button>
            ) : null}
          </div>
          <div className="max-h-[420px] overflow-y-auto scrollbar-thin">
            {items.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <p className="text-sm text-muted-foreground">
                  Você está em dia. Nenhuma notificação por enquanto.
                </p>
              </div>
            ) : (
              <ul>
                {items.map((n) => (
                  <NotificationListItem
                    key={n.id}
                    notification={n}
                    onOpen={() => openNotification(n)}
                  />
                ))}
              </ul>
            )}
          </div>
          <Link
            to={ROUTES.notifications}
            onClick={() => setOpen(false)}
            className="block border-t border-border bg-muted/30 px-4 py-2.5 text-center text-xs font-medium text-primary hover:bg-muted/50"
          >
            Ver todas
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function NotificationListItem({
  notification,
  onOpen,
}: {
  notification: Notification;
  onOpen: () => void;
}) {
  const Icon = TYPE_ICON[notification.type];
  const tone = TYPE_ICON_TONE[notification.type];
  const isUnread = !notification.readAt;
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          'flex w-full items-start gap-3 border-b border-border px-4 py-3 text-left transition hover:bg-muted/50',
          isUnread && 'bg-primary-soft/40',
        )}
      >
        <span
          className={cn(
            'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md [&_svg]:h-4 [&_svg]:w-4',
            tone,
          )}
        >
          <Icon />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-sm font-medium">{notification.title}</p>
            <span className="shrink-0 text-2xs text-muted-foreground">
              {formatRelative(notification.createdAt)}
            </span>
          </div>
          {notification.body ? (
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
              {notification.body}
            </p>
          ) : null}
          <p className="mt-1 text-2xs text-muted-foreground">
            {TYPE_LABEL[notification.type]}
          </p>
        </div>
      </button>
    </li>
  );
}
