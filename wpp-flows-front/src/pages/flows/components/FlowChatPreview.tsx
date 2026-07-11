import { Bot, Check } from 'lucide-react';
import { MessagePreview } from '@/components/messaging/MessagePreview';
import { cn } from '@/lib/utils';
import type { FlowStep } from '@/types';
import { FLOW_VARIABLES } from '../flow-variables';

interface Props {
  steps: FlowStep[];
  botName?: string;
  className?: string;
}

const PREVIEW_VARIABLES = FLOW_VARIABLES.map((v) => ({
  key: v.key,
  label: v.label,
}));

export function FlowChatPreview({ steps, botName, className }: Readonly<Props>) {
  return (
    <div
      className={cn(
        'flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-soft-sm',
        className,
      )}
    >
      <div className="flex shrink-0 items-center gap-3 border-b border-border bg-primary px-4 py-3 text-primary-foreground">
        <span className="flex size-9 items-center justify-center rounded-full bg-primary-foreground/15">
          <Bot className="size-4" />
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-sm font-semibold">{botName ?? 'Seu bot'}</p>
          <p className="text-2xs opacity-80">online agora</p>
        </div>
        <span className="rounded-full bg-primary-foreground/15 px-2 py-0.5 text-2xs font-medium">
          Prévia
        </span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto bg-muted/40 px-3 py-4 scrollbar-thin">
        <div className="mx-auto rounded-md bg-card px-2.5 py-1 text-2xs text-muted-foreground shadow-soft-sm">
          Cliente enviou uma mensagem — o fluxo responde:
        </div>

        {steps.length === 0 ? (
          <p className="mx-auto mt-6 max-w-[220px] text-center text-xs italic text-muted-foreground">
            Adicione passos ao fluxo para ver a conversa aqui.
          </p>
        ) : (
          steps.map((step, idx) => (
            <div key={step.id} className="flex max-w-[85%] flex-col self-end">
              <div className="relative rounded-lg rounded-tr-sm bg-primary-soft px-3 py-2 shadow-soft-sm">
                <MessagePreview
                  value={step.content}
                  variables={PREVIEW_VARIABLES}
                  size="sm"
                  className="border-0 bg-transparent p-0 text-xs leading-relaxed"
                />
                <span className="mt-1 flex items-center justify-end gap-1 text-[10px] leading-none text-muted-foreground">
                  passo {idx + 1}
                  <Check className="size-3" />
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      <p className="shrink-0 border-t border-border bg-card px-3 py-2 text-2xs text-muted-foreground text-pretty">
        Passos são enviados em sequência, um após o outro, sempre em resposta a
        uma mensagem do cliente — dentro da janela de 24h do WhatsApp oficial.
      </p>
    </div>
  );
}
