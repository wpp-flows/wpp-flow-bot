import { useRef } from 'react';
import { GripVertical, Trash2, ChevronDown, ChevronRight, Plus, X, Tag, ArrowUp, ArrowDown } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { IconButton } from '@/components/ui/IconButton';
import { Badge, type BadgeProps } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { FlowStep, FlowStepOption, FlowStepType } from '@/types';
import { cn, generateId } from '@/lib/utils';
import { FLOW_VARIABLES, formatVariable } from '../flow-variables';

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
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isDragging?: boolean;
  isOver?: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
}

const TYPE_META: Record<FlowStepType, { label: string; tone: BadgeProps['tone']; description: string }> = {
  MESSAGE: {
    label: 'Mensagem',
    tone: 'info',
    description:
      'Envia uma mensagem de texto. Se houver outra mensagem logo após (Mensagem ou Pagamento), o bot envia em sequência sem precisar de resposta do cliente.',
  },
  MENU: {
    label: 'Menu',
    tone: 'primary',
    description:
      'Enviado como lista interativa do WhatsApp. O bot mostra as categorias do menu; ao escolher uma, exibe os itens dela. Voltar entre categoria e itens é automático.',
  },
  CONFIRMATION: {
    label: 'Confirmação',
    tone: 'success',
    description:
      'Enviado como botões interativos: Confirmar, Adicionar mais e Voltar. O carrinho do cliente é resumido logo acima dos botões.',
  },
  PAYMENT: {
    label: 'Pagamento',
    tone: 'destructive',
    description: 'Envia instruções de pagamento ou um link configurado em metadata.paymentLink.',
  },
  INPUT: {
    label: 'Entrada do cliente',
    tone: 'warning',
    description:
      'Envia a mensagem como pergunta e captura a próxima resposta digitada do cliente no campo escolhido (ex: observação, endereço). Disponível em mensagens seguintes via {{input.<campo>}}.',
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

const hasOptions = (step: FlowStep): boolean => getOptions(step).length > 0;

const getFieldKey = (step: FlowStep): string => {
  const key = (step.metadata as { fieldKey?: unknown } | null)?.fieldKey;
  return typeof key === 'string' ? key : '';
};

const setFieldKey = (step: FlowStep, fieldKey: string): FlowStep => ({
  ...step,
  metadata: { ...(step.metadata ?? {}), fieldKey },
});

const COMMON_FIELD_KEYS = ['observation', 'address', 'note'] as const;

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
  onMoveUp,
  onMoveDown,
  isDragging,
  isOver,
  dragHandleProps,
}: Readonly<StepNodeProps>) {
  const meta = TYPE_META[step.type];
  const supportsOptions = step.type === 'MENU';
  const isInput = step.type === 'INPUT';
  const options = getOptions(step);
  const usesMenuCategories = supportsOptions && menuCategoryOptions.length > 0;
  const visibleOptions = usesMenuCategories ? menuCategoryOptions : options;
  const headerLabel = `Passo ${String(index + 1).padStart(2, '0')}`;
  const fieldKey = getFieldKey(step);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

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
    const nextContent = `${before}${token}${after}`;
    onChange({ ...step, content: nextContent });
    // Restore focus + caret after React's controlled re-render.
    requestAnimationFrame(() => {
      if (!textareaRef.current) return;
      const caret = start + token.length;
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(caret, caret);
    });
  };

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
        {/* Touch devices can't use HTML5 drag — show explicit up/down arrows
            on mobile. Drag handle stays for pointer devices. */}
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
                if (
                  nextType === 'MENU' &&
                  menuCategoryOptions.length > 0 &&
                  (step.type !== 'MENU' || !hasOptions(step))
                ) {
                  onChange(setOptions({ ...step, type: nextType }, menuCategoryOptions));
                  return;
                }
                if (nextType === 'INPUT' && !getFieldKey(step)) {
                  onChange(setFieldKey({ ...step, type: nextType }, 'observation'));
                  return;
                }
                onChange({ ...step, type: nextType });
              }}
            >
              <option value="MESSAGE">Mensagem</option>
              <option value="MENU">Menu</option>
              <option value="CONFIRMATION">Confirmação</option>
              <option value="PAYMENT">Pagamento</option>
              <option value="INPUT">Entrada do cliente</option>
            </Select>
          </label>

          <p className="text-2xs text-muted-foreground">{meta.description}</p>

          {isInput ? (
            <label className="block space-y-1.5">
              <span className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                Campo a salvar
              </span>
              <Input
                value={fieldKey}
                placeholder="observation"
                onChange={(e) => onChange(setFieldKey(step, e.target.value))}
                list={`field-key-suggestions-${step.id}`}
              />
              <datalist id={`field-key-suggestions-${step.id}`}>
                {COMMON_FIELD_KEYS.map((k) => (
                  <option key={k} value={k} />
                ))}
              </datalist>
              <span className="text-2xs text-muted-foreground">
                Identificador usado em <code className="rounded bg-muted px-1 py-0.5 font-mono">{`{{input.${fieldKey || 'campo'}}}`}</code> nos passos seguintes.
              </span>
            </label>
          ) : null}

          <label className="block space-y-1.5">
            <span className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
              {isInput ? 'Pergunta para o cliente' : 'Conteúdo da mensagem'}
            </span>
            <Textarea
              ref={textareaRef}
              rows={4}
              value={step.content}
              onChange={(e) => onChange({ ...step, content: e.target.value })}
              placeholder={
                isInput
                  ? 'Ex: Alguma observação no seu pedido?'
                  : 'Ex: Olá {{customer_name}}, segue o cardápio!'
              }
            />
          </label>

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
                  As opções são sincronizadas com o menu e as mesmas são exibidas na lista interativa enviada ao cliente. Os itens de cada categoria são adicionados automaticamente em uma segunda lista quando o clienteselect a categoria — não é preciso configurar nada aqui.
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
