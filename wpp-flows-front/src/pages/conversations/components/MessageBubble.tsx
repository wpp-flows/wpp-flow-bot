import type { Message } from '@/types';
import { cn, formatDateTime } from '@/lib/utils';
import { Bot, Check, CheckCheck, Headset } from 'lucide-react';

export function MessageBubble({ message }: Readonly<{ message: Message }>) {
  if (message.author === 'SYSTEM') {
    return (
      <div className="flex justify-center my-2">
        <span className="rounded-full bg-muted px-3 py-1 text-2xs text-muted-foreground">
          {message.content}
        </span>
      </div>
    );
  }

  const fromUs = message.author === 'BOT' || message.author === 'AGENT';
  const isBot = message.author === 'BOT';

  return (
    <div className={cn('flex gap-2', fromUs ? 'justify-start' : 'justify-end')}>
      {fromUs ? (
        <span
          className={cn(
            'mt-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-primary-foreground',
            isBot ? 'bg-primary' : 'bg-info',
          )}
        >
          {isBot ? <Bot className="h-3 w-3" /> : <Headset className="h-3 w-3" />}
        </span>
      ) : null}
      <div
        className={cn(
          'group max-w-[75%] rounded-2xl px-3.5 py-2 text-sm shadow-soft-sm',
          fromUs
            ? 'rounded-bl-sm bg-card border border-border text-foreground'
            : 'rounded-br-sm bg-primary text-primary-foreground',
        )}
      >
        <p className="whitespace-pre-wrap text-pretty leading-relaxed">{message.content}</p>
        <div
          className={cn(
            'mt-1 flex items-center gap-1 text-2xs',
            fromUs ? 'text-muted-foreground' : 'text-primary-foreground/80',
          )}
        >
          <span>{formatDateTime(message.createdAt)}</span>
          {fromUs ? <StatusIcon status={message.status} /> : null}
        </div>
      </div>
    </div>
  );
}

function StatusIcon({ status }: Readonly<{ status: Message['status'] }>) {
  if (status === 'READ') return <CheckCheck className="h-3 w-3 text-info" />;
  if (status === 'DELIVERED') return <CheckCheck className="h-3 w-3" />;
  if (status === 'SENT') return <Check className="h-3 w-3" />;
  return null;
}
