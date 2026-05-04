import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Phone, Send, XCircle } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tooltip } from '@/components/ui/Tooltip';
import { Textarea } from '@/components/ui/Textarea';
import { StatusBadge } from '@/components/feedback/StatusBadge';
import { Badge } from '@/components/ui/Badge';
import { chatService } from '@/services/chatService';
import { queryKeys } from '@/lib/queryClient';
import { toast } from '@/stores/uiStore';
import { formatDateTime } from '@/lib/utils';
import type { Conversation } from '@/types';
import { MessageBubble } from './MessageBubble';

const STATUS_TONE: Record<Conversation['status'], 'success' | 'neutral' | 'warning'> = {
  open: 'success',
  closed: 'neutral',
  pending: 'warning',
};

export function ChatPanel({ conversation }: { conversation: Conversation }) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const messages = useQuery({
    queryKey: queryKeys.chats.messages(conversation.id),
    queryFn: () => chatService.listMessages(conversation.id),
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.data?.length, conversation.id]);

  const send = useMutation({
    mutationFn: (content: string) => chatService.sendMessage(conversation.id, content),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.chats.messages(conversation.id) });
      qc.invalidateQueries({ queryKey: queryKeys.chats.all });
      setDraft('');
    },
    onError: () => toast.error('Failed to send message'),
  });

  const updateStatus = useMutation({
    mutationFn: (next: Conversation['status']) => chatService.updateStatus(conversation.id, next),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.chats.all });
      toast.info(`Conversation marked as ${updateStatus.variables}`);
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    send.mutate(text);
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b border-border bg-card/40 px-5 py-3">
        <Avatar name={conversation.contactName} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold tracking-tight">{conversation.contactName}</p>
            <Badge tone={STATUS_TONE[conversation.status]} size="sm" dot>
              {conversation.status}
            </Badge>
            {conversation.tags?.map((t) => (
              <Badge key={t} tone="info" size="sm">
                {t}
              </Badge>
            ))}
          </div>
          <p className="truncate text-2xs text-muted-foreground font-mono">
            {conversation.contactPhone} · started {formatDateTime(conversation.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Tooltip content="Call contact">
            <IconButton variant="ghost" aria-label="Call">
              <Phone />
            </IconButton>
          </Tooltip>
          <StatusBadge status="online" size="sm" />
          {conversation.status !== 'closed' ? (
            <Button
              size="sm"
              variant="outline"
              leftIcon={<CheckCircle2 />}
              onClick={() => updateStatus.mutate('closed')}
              loading={updateStatus.isPending}
            >
              Close
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              leftIcon={<XCircle />}
              onClick={() => updateStatus.mutate('open')}
              loading={updateStatus.isPending}
            >
              Reopen
            </Button>
          )}
        </div>
      </header>

      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto bg-muted/30 px-5 py-6 scrollbar-thin"
      >
        {messages.isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className={`h-12 ${i % 2 ? 'ml-auto w-[55%]' : 'w-[45%]'}`} />
            ))
          : messages.data?.map((m) => <MessageBubble key={m.id} message={m} />)}
      </div>

      <form
        onSubmit={onSubmit}
        className="border-t border-border bg-background p-3"
      >
        <div className="flex items-end gap-2">
          <Textarea
            rows={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSubmit(e);
              }
            }}
            placeholder={`Reply to ${conversation.contactName.split(' ')[0]}…`}
            className="resize-none"
          />
          <Button type="submit" rightIcon={<Send />} disabled={!draft.trim() || send.isPending}>
            Send
          </Button>
        </div>
        <p className="mt-1.5 text-2xs text-muted-foreground">
          Press <kbd className="rounded bg-muted px-1 py-0.5 font-mono text-2xs">Enter</kbd> to send,{' '}
          <kbd className="rounded bg-muted px-1 py-0.5 font-mono text-2xs">Shift + Enter</kbd> for a new line.
        </p>
      </form>
    </div>
  );
}
