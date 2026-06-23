import { useEffect, useMemo, useState } from 'react';
import { ImageOff, Minus, Plus } from 'lucide-react';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { cn } from '@/lib/utils';
import { deriveOptionGroupHelperText } from '@/lib/schemas';
import type {
  PublicCartSelectedOption,
  PublicMenuItem,
  PublicMenuOption,
  PublicMenuOptionGroup,
} from '@/types/publicMenu';
import {
  effectiveItemPrice,
  formatBrl,
  originalDisplayPrice,
  startingPriceFor,
} from '@/helpers/public-menu-helpers';

interface Props {
  item: PublicMenuItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (input: {
    qty: number;
    notes: string;
    selectedOptions: PublicCartSelectedOption[];
  }) => void;
  disabled?: boolean;
}

type Selections = Record<string, string[]>;

export function ProductDetailSheet({
  item,
  open,
  onOpenChange,
  onConfirm,
  disabled = false,
}: Readonly<Props>) {
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState('');
  const [selections, setSelections] = useState<Selections>({});

  useEffect(() => {
    if (!open || !item) return;
    setQty(1);
    setNotes('');
    const initial: Selections = {};
    for (const g of item.optionGroups) {
      if (g.minSelections >= 1 && g.maxSelections === 1 && g.options.length > 0) {
        const cheapest = [...g.options].sort(
          (a, b) =>
            Number.parseFloat(a.additionalPrice) -
            Number.parseFloat(b.additionalPrice),
        )[0];
        if (cheapest) initial[g.id] = [cheapest.id];
      } else {
        initial[g.id] = [];
      }
    }
    setSelections(initial);
  }, [open, item]);

  const flatSelections = useMemo<PublicCartSelectedOption[]>(() => {
    if (!item) return [];
    const out: PublicCartSelectedOption[] = [];
    for (const g of item.optionGroups) {
      const picked = selections[g.id] ?? [];
      for (const optId of picked) {
        const opt = g.options.find((o) => o.id === optId);
        if (!opt) continue;
        out.push({
          groupId: g.id,
          optionId: opt.id,
          name: opt.name,
          additionalPrice: opt.additionalPrice,
        });
      }
    }
    return out;
  }, [item, selections]);

  const effectivePrice = item ? effectiveItemPrice(item) : 0;

  const lineTotal = useMemo(() => {
    const extras = flatSelections.reduce(
      (sum, o) => sum + Number.parseFloat(o.additionalPrice || '0'),
      0,
    );
    return (effectivePrice + extras) * qty;
  }, [effectivePrice, flatSelections, qty]);

  const validationError = useMemo<string | null>(() => {
    if (!item) return null;
    for (const g of item.optionGroups) {
      const picked = selections[g.id]?.length ?? 0;
      if (picked < g.minSelections) {
        return `Complete "${g.title}" para continuar.`;
      }
    }
    return null;
  }, [item, selections]);

  function toggleOption(group: PublicMenuOptionGroup, option: PublicMenuOption) {
    setSelections((prev) => {
      const current = prev[group.id] ?? [];
      const isSelected = current.includes(option.id);

      if (group.maxSelections === 1) {
        if (isSelected && group.minSelections === 0) {
          return { ...prev, [group.id]: [] };
        }
        return { ...prev, [group.id]: [option.id] };
      }

      if (isSelected) {
        return {
          ...prev,
          [group.id]: current.filter((id) => id !== option.id),
        };
      }

      if (current.length >= group.maxSelections) {
        return {
          ...prev,
          [group.id]: [...current.slice(1), option.id],
        };
      }
      return { ...prev, [group.id]: [...current, option.id] };
    });
  }

  function handleConfirm() {
    if (!item || validationError) return;
    onConfirm({
      qty,
      notes: notes.trim(),
      selectedOptions: flatSelections,
    });
    onOpenChange(false);
  }

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={item?.name ?? ''}
      maxHeight="85vh"
      footer={
        item ? (
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
            <div className="inline-flex items-center gap-1 rounded-md border border-border bg-background">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                disabled={disabled}
                className="inline-flex h-9 w-9 items-center justify-center text-muted-foreground hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
                aria-label="Diminuir"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="min-w-7 text-center text-sm font-medium tabular-nums">
                {qty}
              </span>
              <button
                type="button"
                onClick={() => setQty((q) => q + 1)}
                disabled={disabled}
                className="inline-flex h-9 w-9 items-center justify-center text-muted-foreground hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
                aria-label="Aumentar"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <Button
              size="lg"
              className="flex-1"
              onClick={handleConfirm}
              disabled={disabled || !!validationError}
            >
              {disabled
                ? 'Restaurante fechado'
                : validationError
                  ? validationError
                  : `Adicionar — ${formatBrl(lineTotal)}`}
            </Button>
          </div>
        ) : null
      }
    >
      {item ? (
        <div className="mx-auto flex max-w-3xl flex-col gap-4 pt-2">
          <ItemHeader item={item} />

          {item.optionGroups.map((group) => (
            <OptionGroupSelector
              key={group.id}
              group={group}
              selectedIds={selections[group.id] ?? []}
              onToggle={(opt) => toggleOption(group, opt)}
            />
          ))}

          {!disabled ? (
            <section>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Observações
              </p>
              <Textarea
                rows={2}
                placeholder="Sem cebola, ponto da massa…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </section>
          ) : null}
        </div>
      ) : null}
    </BottomSheet>
  );
}

interface OptionGroupSelectorProps {
  group: PublicMenuOptionGroup;
  selectedIds: string[];
  onToggle: (option: PublicMenuOption) => void;
}

function OptionGroupSelector({
  group,
  selectedIds,
  onToggle,
}: Readonly<OptionGroupSelectorProps>) {
  const helperText =
    group.subtitle?.trim() ||
    deriveOptionGroupHelperText(group.minSelections, group.maxSelections);
  const isRadio = group.maxSelections === 1;
  const required = group.minSelections >= 1;

  return (
    <section className="rounded-lg border border-border bg-card/40">
      <header className="flex items-start justify-between gap-3 border-b border-border bg-muted/30 px-3 py-2.5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-semibold text-foreground">
              {group.title}
            </h4>
            {required ? (
              <span className="rounded bg-foreground px-1.5 py-0.5 text-2xs font-semibold uppercase tracking-wider text-background">
                Obrigatório
              </span>
            ) : null}
          </div>
          <p className="text-2xs text-muted-foreground">{helperText}</p>
        </div>
      </header>

      <ul className="divide-y divide-border">
        {group.options.map((option) => {
          const checked = selectedIds.includes(option.id);
          const priceNum = Number.parseFloat(option.additionalPrice || '0');
          return (
            <li key={option.id}>
              <button
                type="button"
                onClick={() => onToggle(option)}
                className={cn(
                  'flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition',
                  checked ? 'bg-primary/5' : 'hover:bg-muted/40',
                )}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <SelectionMark checked={checked} isRadio={isRadio} />
                  <span className="truncate text-sm font-medium">
                    {option.name}
                  </span>
                </span>
                {priceNum > 0 ? (
                  <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                    + {formatBrl(priceNum)}
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function SelectionMark({
  checked,
  isRadio,
}: {
  checked: boolean;
  isRadio: boolean;
}) {
  return (
    <span
      className={cn(
        'flex h-5 w-5 shrink-0 items-center justify-center border transition',
        isRadio ? 'rounded-full' : 'rounded',
        checked
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-background',
      )}
      aria-hidden
    >
      {checked ? (
        isRadio ? (
          <span className="h-2 w-2 rounded-full bg-current" />
        ) : (
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <path
              d="M3 8.5L6.5 12L13 5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )
      ) : null}
    </span>
  );
}

function ItemHeader({ item }: { item: PublicMenuItem }) {
  const startingPrice = startingPriceFor(item);
  const effective = effectiveItemPrice(item);
  const original = originalDisplayPrice(item);
  const hasStrike = original != null && original > effective;
  const hasFrom = startingPrice > effective;

  return (
    <div className="flex flex-col gap-3">
      <ItemImage url={item.imageUrl} alt={item.name} />
      <div>
        {item.description ? (
          <p className="whitespace-pre-line break-words text-sm text-muted-foreground">
            {item.description}
          </p>
        ) : null}
        <div className="mt-2 flex flex-wrap items-baseline gap-2">
          {hasFrom ? (
            <span className="text-2xs uppercase tracking-wider text-muted-foreground">
              A partir de
            </span>
          ) : null}
          {hasStrike ? (
            <span className="text-sm text-muted-foreground line-through">
              {formatBrl(original)}
            </span>
          ) : null}
          <span
            className={cn(
              'text-base font-semibold',
              hasStrike ? 'text-primary' : 'text-foreground',
            )}
          >
            {formatBrl(hasFrom ? startingPrice : effective)}
          </span>
        </div>
      </div>
    </div>
  );
}

function ItemImage({ url, alt }: { url: string | null; alt: string }) {
  const [errored, setErrored] = useState(false);
  if (!url || errored) {
    return (
      <div className="flex h-56 w-full items-center justify-center rounded-lg bg-muted text-muted-foreground sm:h-64">
        <ImageOff className="h-7 w-7" />
      </div>
    );
  }
  return (
    <div className="flex h-56 w-full items-center justify-center overflow-hidden rounded-lg bg-muted/50 sm:h-64">
      <img
        src={url}
        alt={alt}
        onError={() => setErrored(true)}
        className="h-full w-full object-contain"
      />
    </div>
  );
}

