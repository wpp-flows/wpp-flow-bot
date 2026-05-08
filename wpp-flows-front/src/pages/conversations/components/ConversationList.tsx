import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Bot, MessagesSquare } from 'lucide-react';
import type { Conversation, ConversationStatus } from '@/types';
import { cn, formatRelativeTime } from '@/lib/utils';

interface Props {
  conversations: Conversation[];
  isLoading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  botNamesById: Record<string, string>;
}

const STATUS_TONE: Record<ConversationStatus, 'success' | 'neutral' | 'warning'> = {
  OPEN: 'success',
  CLOSED: 'neutral',
  PENDING: 'warning',
};

const STATUS_LABEL: Record<ConversationStatus, string> = {
  OPEN: 'aberta',
  CLOSED: 'fechada',
  PENDING: 'pendente',
};

export function ConversationList({
  conversations,
  isLoading,
  selectedId,
  onSelect,
  botNamesById,
}: Readonly<Props>) {
  if (isLoading) {
    return (
      <div className="space-y-2 p-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="p-3">
        <EmptyState
          icon={<MessagesSquare />}
          title="Nenhuma conversa corresponde"
          description="Tente limpar os filtros ou ampliar o intervalo de datas."
        />
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {conversations.map((c) => {
        const active = c.id === selectedId;
        const botName = botNamesById[c.botId] ?? 'Bot desconhecido';
        return (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => onSelect(c.id)}
              className={cn(
                'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors',
                'hover:bg-muted/40',
                active && 'bg-primary-soft/60 hover:bg-primary-soft/80',
              )}
            >
              <Avatar name={c.contactName} size="md" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className={cn('truncate text-sm font-semibold tracking-tight', active && 'text-primary')}>
                    {c.contactName}
                  </p>
                  <span className="shrink-0 text-2xs text-muted-foreground">
                    {formatRelativeTime(c.lastMessageAt)}
                  </span>
                </div>
                <p className="truncate text-xs text-muted-foreground">{c.lastMessagePreview}</p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-2xs font-medium text-muted-foreground">
                    <Bot className="h-3 w-3" />
                    {botName}
                  </span>
                  <Badge size="sm" tone={STATUS_TONE[c.status]} dot>
                    {STATUS_LABEL[c.status]}
                  </Badge>
                  {c.unreadCount > 0 && c.id !== selectedId ? (
                    <span className="ml-auto inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-2xs font-semibold text-primary-foreground">
                      {c.unreadCount}
                    </span>
                  ) : null}
                </div>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
