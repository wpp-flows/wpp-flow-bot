import { ImageOff, Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import type { PublicMenuItem } from '@/types/publicMenu';
import { cartLineTotal, usePublicCart } from '../hooks/usePublicCart';
import { formatBrl } from '@/helpers/public-menu-helpers';

interface Props {
  slug: string;
  items: PublicMenuItem[];
  onBrowseMenu: () => void;
  onCheckout: () => void;
}

export function CartTab({ slug, items: menuItems, onBrowseMenu, onCheckout }: Readonly<Props>) {
  const cart = usePublicCart(slug);
  const itemById = new Map(menuItems.map((it) => [it.id, it]));

  if (cart.items.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-4 text-center">
        <ShoppingCart className="h-8 w-8 text-muted-foreground" />
        <h2 className="font-medium">Seu carrinho está vazio</h2>
        <p className="text-sm text-muted-foreground">
          Volte ao cardápio para adicionar itens.
        </p>
        <Button onClick={onBrowseMenu}>Ver cardápio</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="space-y-3">
        {cart.items.map((item) => {
          const menuItem = itemById.get(item.itemId) ?? null;
          return (
            <li
              key={item.id}
              className="rounded-lg border border-border bg-card p-4 shadow-soft-sm"
            >
              <div className="flex items-start gap-3">
                <ItemImage url={menuItem?.imageUrl ?? null} alt={item.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{item.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatBrl(item.price)} {item.qty > 1 ? '· un.' : ''}
                  </p>
                  {item.additionals.length > 0 ? (
                    <ul className="mt-2 space-y-0.5 text-2xs text-muted-foreground">
                      {item.additionals.map((a) => (
                        <li key={a.id}>+ {a.name} ({formatBrl(a.price)})</li>
                      ))}
                    </ul>
                  ) : null}
                  {item.notes ? (
                    <p className="mt-1 text-2xs italic text-muted-foreground">
                      "{item.notes}"
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
                <button
                  type="button"
                  onClick={() => cart.remove(item.id)}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remover
                </button>
                <div className="flex items-center gap-3">
                  <p className="font-semibold tabular-nums">
                    {formatBrl(cartLineTotal(item))}
                  </p>
                  <div className="inline-flex items-center gap-1 rounded-md border border-border bg-background">
                    <button
                      type="button"
                      onClick={() => cart.updateQty(item.id, item.qty - 1)}
                      className="inline-flex h-8 w-8 items-center justify-center text-muted-foreground hover:text-foreground"
                      aria-label="Diminuir"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="min-w-6 text-center text-sm tabular-nums">
                      {item.qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => cart.updateQty(item.id, item.qty + 1)}
                      className="inline-flex h-8 w-8 items-center justify-center text-muted-foreground hover:text-foreground"
                      aria-label="Aumentar"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className={cn('flex items-center justify-between gap-3 border-t border-border pt-4')}>
        <div className="text-sm">
          <p className="text-muted-foreground">Subtotal</p>
          <p className="font-semibold">{formatBrl(cart.subtotal)}</p>
        </div>
        <Button size="lg" onClick={onCheckout}>
          Finalizar Pedido
        </Button>
      </div>
    </div>
  );
}

function ItemImage({ url, alt }: { url: string | null; alt: string }) {
  const [errored, setErrored] = useState(false);
  if (!url || errored) {
    return (
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <ImageOff className="h-5 w-5" />
      </div>
    );
  }
  return (
    <img
      src={url}
      alt={alt}
      onError={() => setErrored(true)}
      className="h-16 w-16 shrink-0 rounded-md object-cover"
    />
  );
}
