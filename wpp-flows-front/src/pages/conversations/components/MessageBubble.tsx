import type { Message } from '@/types';
import { cn } from '@/lib/utils';
import { Bot, Check, CheckCheck, Headset, TriangleAlert } from 'lucide-react';

const timeOf = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', { timeStyle: 'short' }).format(new Date(iso));

interface Props {
  message: Message;
  isLastOfGroup?: boolean;
}

export function MessageBubble({ message, isLastOfGroup = true }: Readonly<Props>) {
  if (message.author === 'SYSTEM') {
    return (
      <div className="my-2 flex justify-center">
        <span className="rounded-full bg-card px-3 py-1 text-2xs text-muted-foreground shadow-soft-sm">
          {message.content}
        </span>
      </div>
    );
  }

  const fromUs = message.author === 'BOT' || message.author === 'AGENT';
  const isBot = message.author === 'BOT';
  const failed = message.status === 'FAILED';

  return (
    <div
      className={cn(
        'flex w-full items-end gap-2',
        fromUs ? 'justify-end' : 'justify-start',
        isLastOfGroup ? 'mb-2' : 'mb-0.5',
      )}
    >
      {fromUs ? <SenderAvatar isBot={isBot} visible={isLastOfGroup} /> : null}

      <div
        className={cn(
          'max-w-[78%] px-3 py-1.5 text-sm shadow-soft-sm transition-colors',
          'rounded-2xl',
          fromUs
            ? 'bg-primary-soft text-foreground'
            : 'bg-card text-foreground',
          isLastOfGroup && (fromUs ? 'rounded-br-sm' : 'rounded-bl-sm'),
          failed && 'ring-1 ring-destructive/40',
        )}
      >
        <p className="whitespace-pre-wrap break-words text-pretty leading-relaxed">
          {message.content}
        </p>
        <div className="mt-0.5 flex items-center justify-end gap-1 text-[10px] leading-none text-muted-foreground">
          <span className="tabular-nums">{timeOf(message.createdAt)}</span>
          {fromUs ? <StatusIcon status={message.status} /> : null}
        </div>
      </div>
    </div>
  );
}

function SenderAvatar({
  isBot,
  visible,
}: Readonly<{ isBot: boolean; visible: boolean }>) {
  if (!visible) return <span className="order-2 size-6 shrink-0" />;
  return (
    <span
      className={cn(
        'order-2 flex size-6 shrink-0 items-center justify-center rounded-full text-primary-foreground',
        isBot ? 'bg-primary' : 'bg-info',
      )}
      title={isBot ? 'Enviada pelo bot' : 'Enviada por um atendente'}
    >
      {isBot ? <Bot className="size-3" /> : <Headset className="size-3" />}
    </span>
  );
}

function StatusIcon({ status }: Readonly<{ status: Message['status'] }>) {
  if (status === 'READ') return <CheckCheck className="size-3 text-info" />;
  if (status === 'DELIVERED') return <CheckCheck className="size-3" />;
  if (status === 'SENT') return <Check className="size-3" />;
  if (status === 'FAILED') {
    return <TriangleAlert className="size-3 text-destructive" />;
  }
  return null;
}
