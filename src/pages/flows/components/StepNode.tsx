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
  expanded: boolean;
  onToggle: () => void;
  onChange: (next: FlowStep) => void;
  onRemove: () => void;
  isDragging?: boolean;
  isOver?: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
}

const TYPE_META: Record<FlowStepType, { label: string; tone: BadgeProps['tone']; description: string }> = {
  message: {
    label: 'Message',
    tone: 'info',
    description: 'Sends a plain text message to the customer.',
  },
  menu: {
    label: 'Menu',
    tone: 'primary',
    description: 'Shows a numbered list of options the customer can pick from.',
  },
  'item-selection': {
    label: 'Item selection',
    tone: 'warning',
    description: 'Lets the customer pick a dish from the configured menu.',
  },
  confirmation: {
    label: 'Confirmation',
    tone: 'success',
    description: 'Asks the customer to confirm the order before submitting.',
  },
  payment: {
    label: 'Payment',
    tone: 'destructive',
    description: 'Sends payment instructions or a payment link.',
  },
};

export function StepNode({
  step,
  index,
  total,
  expanded,
  onToggle,
  onChange,
  onRemove,
  isDragging,
  isOver,
  dragHandleProps,
}: StepNodeProps) {
  const meta = TYPE_META[step.type];
  const supportsOptions = step.type === 'menu' || step.type === 'confirmation';

  const updateOption = (id: string, patch: Partial<FlowStepOption>) => {
    const options = (step.options ?? []).map((o) => (o.id === id ? { ...o, ...patch } : o));
    onChange({ ...step, options });
  };

  const addOption = () => {
    const opt = {
      id: generateId('opt'),
      label: `Option ${(step.options?.length ?? 0) + 1}`,
      value: `option_${(step.options?.length ?? 0) + 1}`,
    };
    onChange({ ...step, options: [...(step.options ?? []), opt] });
  };

  const removeOption = (id: string) => {
    onChange({ ...step, options: (step.options ?? []).filter((o) => o.id !== id) });
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
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-2xs font-mono font-semibold text-muted-foreground">
          {String(index + 1).padStart(2, '0')}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold tracking-tight">{step.title}</p>
            <Badge size="sm" tone={meta.tone}>
              {meta.label}
            </Badge>
          </div>
          {!expanded ? (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{step.content}</p>
          ) : null}
        </div>

        <IconButton size="sm" variant="ghost" onClick={onToggle} aria-label="Toggle">
          {expanded ? <ChevronDown /> : <ChevronRight />}
        </IconButton>
        <IconButton
          size="sm"
          variant="ghost"
          onClick={onRemove}
          aria-label="Delete step"
          disabled={total === 1}
        >
          <Trash2 className={total === 1 ? '' : 'text-destructive'} />
        </IconButton>
      </div>

      {expanded ? (
        <div className="space-y-3 border-t border-border px-4 py-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                Step title
              </span>
              <Input value={step.title} onChange={(e) => onChange({ ...step, title: e.target.value })} />
            </label>
            <label className="space-y-1.5">
              <span className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                Step type
              </span>
              <Select
                value={step.type}
                onChange={(e) => {
                  const nextType = e.target.value as FlowStepType;
                  const next: FlowStep = { ...step, type: nextType };
                  if (nextType !== 'menu' && nextType !== 'confirmation') {
                    delete next.options;
                  } else if (!step.options) {
                    next.options = [];
                  }
                  onChange(next);
                }}
              >
                <option value="message">Message</option>
                <option value="menu">Menu</option>
                <option value="item-selection">Item selection</option>
                <option value="confirmation">Confirmation</option>
                <option value="payment">Payment</option>
              </Select>
            </label>
          </div>

          <p className="text-2xs text-muted-foreground">{meta.description}</p>

          <label className="block space-y-1.5">
            <span className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
              Message content
            </span>
            <Textarea
              rows={4}
              value={step.content}
              onChange={(e) => onChange({ ...step, content: e.target.value })}
              placeholder="Use {{customer_name}}, {{order_summary}}, {{order_total}} as variables."
            />
          </label>

          {supportsOptions ? (
            <div className="space-y-2 rounded-lg border border-dashed border-border bg-muted/20 p-3">
              <div className="flex items-center justify-between">
                <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Options
                </p>
                <Button size="sm" variant="ghost" leftIcon={<Plus />} onClick={addOption}>
                  Add option
                </Button>
              </div>
              {(step.options ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground">No options yet — add the choices users can reply with.</p>
              ) : (
                <div className="space-y-2">
                  {(step.options ?? []).map((opt) => (
                    <div key={opt.id} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
                      <Input
                        placeholder="Label (e.g. Pizzas)"
                        value={opt.label}
                        onChange={(e) => updateOption(opt.id, { label: e.target.value })}
                      />
                      <Input
                        placeholder="Value (e.g. cat_pizzas)"
                        value={opt.value}
                        onChange={(e) => updateOption(opt.id, { value: e.target.value })}
                      />
                      <IconButton
                        variant="ghost"
                        onClick={() => removeOption(opt.id)}
                        aria-label="Remove option"
                      >
                        <X />
                      </IconButton>
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
