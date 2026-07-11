import { useRef } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Eye,
  GripVertical,
  Tag,
  Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { IconButton } from '@/components/ui/IconButton';
import { Textarea } from '@/components/ui/Textarea';
import { MessagePreview } from '@/components/messaging/MessagePreview';
import { cn } from '@/lib/utils';
import type { FlowStep } from '@/types';
import { FLOW_VARIABLES, formatVariable } from '../flow-variables';

const CLOUD_TEXT_LIMIT = 4096;

interface StepNodeProps {
  step: FlowStep;
  index: number;
  total: number;
  expanded: boolean;
  onToggle: () => void;
  onChange: (next: FlowStep) => void;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isDragging?: boolean;
  isOver?: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
}

export function StepNode({
  step,
  index,
  total,
  expanded,
  onToggle,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  isDragging,
  isOver,
  dragHandleProps,
}: Readonly<StepNodeProps>) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const headerLabel = `Passo ${String(index + 1).padStart(2, '0')}`;

  const insertVariable = (key: string) => {
    const token = formatVariable(key);
    const el = textareaRef.current;
    if (!el) {
      onChange({ ...step, content: `${step.content}${token}` });
      return;
    }
    const start = el.selectionStart ?? step.content.length;
    const end = el.selectionEnd ?? start;
    const before = step.content.slice(0, start);
    const after = step.content.slice(end);
    onChange({ ...step, content: `${before}${token}${after}` });
    requestAnimationFrame(() => {
      if (!textareaRef.current) return;
      const caret = start + token.length;
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(caret, caret);
    });
  };

  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card transition-all',
        isDragging && 'opacity-50',
        isOver && 'ring-2 ring-primary/40 ring-offset-2 ring-offset-background',
      )}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          {...dragHandleProps}
          className="hidden h-7 w-7 cursor-grab items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing sm:flex"
          aria-label="Arrastar para reordenar"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex flex-col sm:hidden">
          <IconButton
            size="sm"
            variant="ghost"
            onClick={onMoveUp}
            disabled={!onMoveUp || index === 0}
            aria-label="Mover passo para cima"
            className="h-5"
          >
            <ArrowUp />
          </IconButton>
          <IconButton
            size="sm"
            variant="ghost"
            onClick={onMoveDown}
            disabled={!onMoveDown || index === total - 1}
            aria-label="Mover passo para baixo"
            className="h-5"
          >
            <ArrowDown />
          </IconButton>
        </div>

        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-2xs font-mono font-semibold text-muted-foreground">
          {String(index + 1).padStart(2, '0')}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold tracking-tight">{headerLabel}</p>
            <Badge size="sm" tone="info">
              Mensagem
            </Badge>
          </div>
          {!expanded ? (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{step.content}</p>
          ) : null}
        </div>

        <IconButton size="sm" variant="ghost" onClick={onToggle} aria-label="Expandir ou recolher">
          {expanded ? <ChevronDown /> : <ChevronRight />}
        </IconButton>
        <IconButton
          size="sm"
          variant="ghost"
          onClick={onRemove}
          aria-label="Excluir passo"
          disabled={total === 1}
        >
          <Trash2 className={total === 1 ? '' : 'text-destructive'} />
        </IconButton>
      </div>

      {expanded ? (
        <div className="space-y-3 border-t border-border px-4 py-4">
          <p className="text-2xs text-muted-foreground">
            Envia uma mensagem de texto. Quando há mensagens em sequência, o bot envia
            uma após a outra na mesma resposta — perfeito para uma saudação seguida do
            link do cardápio.
          </p>

          <label className="block space-y-1.5">
            <span className="flex items-center justify-between text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
              Conteúdo da mensagem
              <span
                className={cn(
                  'font-mono normal-case tracking-normal',
                  step.content.length > CLOUD_TEXT_LIMIT
                    ? 'font-semibold text-destructive'
                    : 'text-muted-foreground',
                )}
              >
                {step.content.length.toLocaleString('pt-BR')}/
                {CLOUD_TEXT_LIMIT.toLocaleString('pt-BR')}
              </span>
            </span>
            <Textarea
              ref={textareaRef}
              rows={4}
              value={step.content}
              onChange={(e) => onChange({ ...step, content: e.target.value })}
              placeholder="Ex: Olá {{customer_name}}! Faça seu pedido em {{menu_url}}"
            />
            {step.content.length > CLOUD_TEXT_LIMIT ? (
              <span className="block text-2xs text-destructive">
                O WhatsApp oficial aceita no máximo{' '}
                {CLOUD_TEXT_LIMIT.toLocaleString('pt-BR')} caracteres por
                mensagem — reduza o texto ou divida em dois passos.
              </span>
            ) : null}
          </label>

          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Eye className="h-3 w-3" />
              Pré-visualização
            </div>
            <MessagePreview
              value={step.content}
              variables={FLOW_VARIABLES.map((v) => ({
                key: v.key,
                label: v.label,
              }))}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Tag className="h-3 w-3" />
              Variáveis disponíveis
            </div>
            <div className="flex flex-wrap gap-1.5">
              {FLOW_VARIABLES.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => insertVariable(v.key)}
                  title={v.description}
                  className="rounded-full border border-border bg-muted/40 px-2 py-0.5 font-mono text-2xs text-muted-foreground transition hover:border-primary hover:bg-primary-soft hover:text-primary"
                >
                  {`{{${v.key}}}`}
                </button>
              ))}
            </div>
            <p className="text-2xs text-muted-foreground">
              Clique para inserir no cursor. Variáveis sem valor no momento ficam vazias.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
