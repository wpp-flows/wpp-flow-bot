import { useCallback, useEffect, useState } from 'react';
import type {
  PublicCartItem,
  PublicCartSelectedOption,
} from '@/types/publicMenu';

const STORAGE_PREFIX = 'mesa.public-cart';

function storageKey(slug: string): string {
  return `${STORAGE_PREFIX}.${slug}`;
}

function readCart(slug: string): PublicCartItem[] {
  try {
    const raw = localStorage.getItem(storageKey(slug));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as Array<PublicCartItem & { additionals?: unknown }>).map(
      (it) => ({
        ...it,
        selectedOptions: Array.isArray(it.selectedOptions)
          ? it.selectedOptions
          : [],
      }),
    );
  } catch {
    return [];
  }
}

/**
 * Per-line total, including all selected options (each option charged once
 * per line, multiplied by qty alongside the base price). Lives next to the
 * cart so the cart UI and checkout pricing share one source of truth.
 */
export function cartLineTotal(item: PublicCartItem): number {
  const base = Number.parseFloat(item.price || '0');
  const extras = item.selectedOptions.reduce(
    (sum, o) => sum + Number.parseFloat(o.additionalPrice || '0'),
    0,
  );
  return (base + extras) * item.qty;
}

function sameSignature(a: PublicCartItem, b: PublicCartItem): boolean {
  if (a.itemId !== b.itemId) return false;
  if ((a.notes ?? '') !== (b.notes ?? '')) return false;
  if (a.bundle || b.bundle) return false;
  return optionsKey(a.selectedOptions) === optionsKey(b.selectedOptions);
}

function optionsKey(opts: PublicCartSelectedOption[]): string {
  return opts
    .map((o) => `${o.groupId}:${o.optionId}`)
    .sort()
    .join('|');
}

const subscribers = new Map<string, Set<() => void>>();

function notify(slug: string) {
  subscribers.get(slug)?.forEach((cb) => cb());
}

function subscribe(slug: string, cb: () => void): () => void {
  let set = subscribers.get(slug);
  if (!set) {
    set = new Set();
    subscribers.set(slug, set);
  }
  set.add(cb);
  return () => {
    set?.delete(cb);
    if (set?.size === 0) subscribers.delete(slug);
  };
}

export function usePublicCart(slug: string) {
  const [items, setItems] = useState<PublicCartItem[]>(() => readCart(slug));

  useEffect(() => {
    const refresh = () => setItems(readCart(slug));
    const onStorage = (e: StorageEvent) => {
      if (e.key === storageKey(slug)) refresh();
    };
    const unsubscribe = subscribe(slug, refresh);
    globalThis.addEventListener('storage', onStorage);
    refresh();
    return () => {
      unsubscribe();
      globalThis.removeEventListener('storage', onStorage);
    };
  }, [slug]);

  const persist = useCallback(
    (next: PublicCartItem[]) => {
      setItems(next);
      try {
        localStorage.setItem(storageKey(slug), JSON.stringify(next));
      } catch {
        // localStorage full / disabled — fail silently; the cart still works
        // in-memory for this session.
      }
      notify(slug);
    },
    [slug],
  );

  const add = useCallback(
    (item: Omit<PublicCartItem, 'id' | 'qty' | 'selectedOptions'> & {
      qty?: number;
      selectedOptions?: PublicCartSelectedOption[];
      notes?: string | null;
    }) => {
      const candidate: PublicCartItem = {
        id: crypto.randomUUID(),
        itemId: item.itemId,
        name: item.name,
        price: item.price,
        qty: item.qty ?? 1,
        notes: item.notes ?? null,
        selectedOptions: item.selectedOptions ?? [],
        bundle: item.bundle ?? null,
      };
      const current = readCart(slug);
      const existingIdx = current.findIndex((p) => sameSignature(p, candidate));
      let next: PublicCartItem[];
      if (existingIdx >= 0) {
        next = [...current];
        next[existingIdx] = {
          ...next[existingIdx]!,
          qty: next[existingIdx]!.qty + candidate.qty,
        };
      } else {
        next = [...current, candidate];
      }
      persist(next);
    },
    [slug, persist],
  );

  const updateQty = useCallback(
    (id: string, qty: number) => {
      const next = readCart(slug)
        .map((it) => (it.id === id ? { ...it, qty: Math.max(0, Math.floor(qty)) } : it))
        .filter((it) => it.qty > 0);
      persist(next);
    },
    [slug, persist],
  );

  const remove = useCallback(
    (id: string) => {
      const next = readCart(slug).filter((it) => it.id !== id);
      persist(next);
    },
    [slug, persist],
  );

  const clear = useCallback(() => persist([]), [persist]);

  const subtotal = items.reduce((sum, it) => sum + cartLineTotal(it), 0);
  const totalItems = items.reduce((sum, it) => sum + it.qty, 0);

  return { items, add, updateQty, remove, clear, subtotal, totalItems };
}
