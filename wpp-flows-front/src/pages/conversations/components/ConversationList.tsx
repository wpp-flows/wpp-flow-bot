import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { MessagesSquare } from 'lucide-react';
import type { Conversation, ConversationStatus } from '@/types';
import { cn, formatRelativeTime } from '@/lib/utils';

interface Props {
  conversations: Conversation[];
  isLoading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const STATUS_TONE: Record<ConversationStatus, 'success' | 'neutral' | 'warning'> = {
  open: 'success',
  closed: 'neutral',
  pending: 'warning',
};

export function ConversationList({ conversations, isLoading, selectedId, onSelect }: Props) {
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
          title="No conversations match"
          description="Try clearing filters or expanding the date range."
        />
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {conversations.map((c) => {
        const active = c.id === selectedId;
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
                <div className="mt-1 flex items-center gap-1.5">
                  <Badge size="sm" tone={STATUS_TONE[c.status]} dot>
                    {c.status}
                  </Badge>
                  {c.unreadCount > 0 ? (
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
