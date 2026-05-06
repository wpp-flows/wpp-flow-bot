import type { Message } from '@/types';
import { cn, formatDateTime } from '@/lib/utils';
import { Bot, Check, CheckCheck } from 'lucide-react';

export function MessageBubble({ message }: { message: Message }) {
  const isBot = message.author === 'bot';
  const isSystem = message.author === 'system';

  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <span className="rounded-full bg-muted px-3 py-1 text-2xs text-muted-foreground">
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <div className={cn('flex gap-2', isBot ? 'justify-start' : 'justify-end')}>
      {isBot ? (
        <span className="mt-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Bot className="h-3 w-3" />
        </span>
      ) : null}
      <div
        className={cn(
          'group max-w-[75%] rounded-2xl px-3.5 py-2 text-sm shadow-soft-sm',
          isBot
            ? 'rounded-bl-sm bg-card border border-border text-foreground'
            : 'rounded-br-sm bg-primary text-primary-foreground',
        )}
      >
        <p className="whitespace-pre-wrap text-pretty leading-relaxed">{message.content}</p>
        <div
          className={cn(
            'mt-1 flex items-center gap-1 text-2xs',
            isBot ? 'text-muted-foreground' : 'text-primary-foreground/80',
          )}
        >
          <span>{formatDateTime(message.createdAt)}</span>
          {!isBot ? null : message.status === 'read' ? (
            <CheckCheck className="h-3 w-3 text-info" />
          ) : message.status === 'delivered' ? (
            <CheckCheck className="h-3 w-3" />
          ) : message.status === 'sent' ? (
            <Check className="h-3 w-3" />
          ) : null}
        </div>
      </div>
    </div>
  );
}
