import { GripVertical, Trash2, ChevronDown, ChevronRight, Plus, X } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { IconButton } from '@/components/ui/IconButton';
import { Badge, type BadgeProps } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { FlowStep, FlowStepOption, FlowStepType } from '@/types';
import { cn, generateId } from '@/lib/utils';

interface StepNodeProps {
  step: FlowStep;
  index: number;
  total: number;
  menuCategoryOptions?: FlowStepOption[];
  menuCategoriesLoading?: boolean;
  expanded: boolean;
  onToggle: () => void;
  onChange: (next: FlowStep) => void;
  onRemove: () => void;
  isDragging?: boolean;
  isOver?: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
}

const TYPE_META: Record<FlowStepType, { label: string; tone: BadgeProps['tone']; description: string }> = {
  MESSAGE: {
    label: 'Mensagem',
    tone: 'info',
    description: 'Envia uma mensagem de texto simples para o cliente.',
  },
  MENU: {
    label: 'Menu',
    tone: 'primary',
    description: 'Mostra uma lista numerada de opções para o cliente escolher.',
  },
  CONFIRMATION: {
    label: 'Confirmação',
    tone: 'success',
    description: 'Pede uma confirmação do cliente antes de continuar.',
  },
  PAYMENT: {
    label: 'Pagamento',
    tone: 'destructive',
    description: 'Envia instruções de pagamento ou um link configurado em metadata.paymentLink.',
  },
};

const getOptions = (step: FlowStep): FlowStepOption[] => {
  const opts = (step.metadata as { options?: unknown } | null)?.options;
  return Array.isArray(opts) ? (opts as FlowStepOption[]) : [];
};

const setOptions = (step: FlowStep, options: FlowStepOption[]): FlowStep => ({
  ...step,
  metadata: { ...(step.metadata ?? {}), options },
});

export function StepNode({
  step,
  index,
  total,
  menuCategoryOptions = [],
  menuCategoriesLoading = false,
  expanded,
  onToggle,
  onChange,
  onRemove,
  isDragging,
  isOver,
  dragHandleProps,
}: Readonly<StepNodeProps>) {
  const meta = TYPE_META[step.type];
  const supportsOptions = step.type === 'MENU';
  const options = getOptions(step);
  const usesMenuCategories = supportsOptions && menuCategoryOptions.length > 0;
  const visibleOptions = usesMenuCategories ? menuCategoryOptions : options;
  const headerLabel = `Passo ${String(index + 1).padStart(2, '0')}`;

  const updateOption = (id: string, patch: Partial<FlowStepOption>) => {
    onChange(setOptions(step, options.map((o) => (o.id === id ? { ...o, ...patch } : o))));
  };

  const addOption = () => {
    const opt: FlowStepOption = {
      id: generateId('opt'),
      label: `Opção ${options.length + 1}`,
      value: `option_${options.length + 1}`,
    };
    onChange(setOptions(step, [...options, opt]));
  };

  const removeOption = (id: string) => {
    onChange(setOptions(step, options.filter((o) => o.id !== id)));
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
          className="flex h-7 w-7 cursor-grab items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing"
          aria-label="Arrastar para reordenar"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-2xs font-mono font-semibold text-muted-foreground">
          {String(index + 1).padStart(2, '0')}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold tracking-tight">{headerLabel}</p>
            <Badge size="sm" tone={meta.tone}>
              {meta.label}
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
          <label className="block space-y-1.5">
            <span className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
              Tipo do passo
            </span>
            <Select
              value={step.type}
              onChange={(e) => {
                const nextType = e.target.value as FlowStepType;
                onChange({ ...step, type: nextType });
              }}
            >
              <option value="MESSAGE">Mensagem</option>
              <option value="MENU">Menu</option>
              <option value="CONFIRMATION">Confirmação</option>
              <option value="PAYMENT">Pagamento</option>
            </Select>
          </label>

          <p className="text-2xs text-muted-foreground">{meta.description}</p>

          <label className="block space-y-1.5">
            <span className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
              Conteúdo da mensagem
            </span>
            <Textarea
              rows={4}
              value={step.content}
              onChange={(e) => onChange({ ...step, content: e.target.value })}
              placeholder="Use {{customer_name}}, {{order_summary}}, {{order_total}} como variáveis."
            />
          </label>

          {supportsOptions ? (
            <div className="space-y-2 rounded-lg border border-dashed border-border bg-muted/20 p-3">
              <div className="flex items-center justify-between">
                <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {usesMenuCategories ? 'Categorias do menu' : 'Opções (salvas em metadata.options)'}
                </p>
                {usesMenuCategories ? null : (
                  <Button size="sm" variant="ghost" leftIcon={<Plus />} onClick={addOption}>
                    Adicionar opção
                  </Button>
                )}
              </div>
              {usesMenuCategories ? (
                <p className="text-xs text-muted-foreground">
                  As opções são sincronizadas com as categorias cadastradas no menu e salvas em metadata.options.
                </p>
              ) : null}
              {menuCategoriesLoading && !usesMenuCategories ? (
                <p className="text-xs text-muted-foreground">Carregando categorias do menu...</p>
              ) : null}
              {visibleOptions.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhuma opção ainda. Adicione as escolhas que os usuários podem responder.</p>
              ) : (
                <div className="space-y-2">
                  {visibleOptions.map((opt) => (
                    <div
                      key={opt.id}
                      className={cn(
                        'grid grid-cols-1 gap-2',
                        usesMenuCategories ? 'sm:grid-cols-2' : 'sm:grid-cols-[1fr_1fr_auto]',
                      )}
                    >
                      <Input
                        placeholder="Rótulo (ex: Pizzas)"
                        value={opt.label}
                        disabled={usesMenuCategories}
                        onChange={(e) => updateOption(opt.id, { label: e.target.value })}
                      />
                      <Input
                        placeholder="Valor (ex: cat_pizzas)"
                        value={opt.value}
                        disabled={usesMenuCategories}
                        onChange={(e) => updateOption(opt.id, { value: e.target.value })}
                      />
                      {usesMenuCategories ? null : (
                        <IconButton
                          variant="ghost"
                          onClick={() => removeOption(opt.id)}
                          aria-label="Remover opção"
                        >
                          <X />
                        </IconButton>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
