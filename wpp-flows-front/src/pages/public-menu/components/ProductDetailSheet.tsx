import { useEffect, useMemo, useState } from 'react';
import { ImageOff, Minus, Plus } from 'lucide-react';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { cn } from '@/lib/utils';
import type {
  PublicCartAdditional,
  PublicMenuItem,
} from '@/types/publicMenu';
import { formatBrl } from '@/helpers/public-menu-helpers';

interface Props {
  item: PublicMenuItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (input: {
    qty: number;
    notes: string;
    additionals: PublicCartAdditional[];
  }) => void;
  disabled?: boolean;
}

export function ProductDetailSheet({
  item,
  open,
  onOpenChange,
  onConfirm,
  disabled = false,
}: Readonly<Props>) {
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState('');
  const [selectedAdditionalIds, setSelectedAdditionalIds] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    if (open && item) {
      setQty(1);
      setNotes('');
      setSelectedAdditionalIds(new Set());
    }
  }, [open, item]);

  const selectedAdditionals = useMemo<PublicCartAdditional[]>(() => {
    if (!item) return [];
    return item.additionals
      .filter((a) => selectedAdditionalIds.has(a.id))
      .map((a) => ({ id: a.id, name: a.name, price: a.price }));
  }, [item, selectedAdditionalIds]);

  const lineTotal = useMemo(() => {
    if (!item) return 0;
    const base = Number.parseFloat(item.price || '0');
    const extras = selectedAdditionals.reduce(
      (sum, a) => sum + Number.parseFloat(a.price || '0'),
      0,
    );
    return (base + extras) * qty;
  }, [item, selectedAdditionals, qty]);

  function toggleAdditional(id: string) {
    setSelectedAdditionalIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleConfirm() {
    if (!item) return;
    onConfirm({
      qty,
      notes: notes.trim(),
      additionals: selectedAdditionals,
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
              disabled={disabled}
            >
              {disabled ? 'Restaurante fechado' : `Adicionar — ${formatBrl(lineTotal)}`}
            </Button>
          </div>
        ) : null
      }
    >
      {item ? (
        <div className="mx-auto flex max-w-3xl flex-col gap-4 pt-2">
          <ItemHeader item={item} />

          {item.additionals.length > 0 ? (
            <section>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Adicionais
              </p>
              <ul className="space-y-2">
                {item.additionals.map((add) => {
                  const checked = selectedAdditionalIds.has(add.id);
                  return (
                    <li key={add.id}>
                      <button
                        type="button"
                        onClick={() => toggleAdditional(add.id)}
                        className={cn(
                          'flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left transition',
                          checked
                            ? 'border-primary bg-primary/5'
                            : 'border-border bg-background hover:bg-muted/40',
                        )}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span
                            className={cn(
                              'flex h-5 w-5 shrink-0 items-center justify-center rounded border',
                              checked
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-border bg-background',
                            )}
                          >
                            {checked ? (
                              <svg
                                width="12"
                                height="12"
                                viewBox="0 0 16 16"
                                fill="none"
                                aria-hidden
                              >
                                <path
                                  d="M3 8.5L6.5 12L13 5"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            ) : null}
                          </span>
                          <span className="truncate text-sm font-medium">{add.name}</span>
                        </div>
                        <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                          + {formatBrl(add.price)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

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

function ItemHeader({ item }: { item: PublicMenuItem }) {
  return (
    <div className="flex flex-col gap-3">
      <ItemImage url={item.imageUrl} alt={item.name} />
      <div>
        {item.description ? (
          <p className="whitespace-pre-line break-words text-sm text-muted-foreground">
            {item.description}
          </p>
        ) : null}
        <p className="mt-2 text-base font-semibold">{formatBrl(item.price)}</p>
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
