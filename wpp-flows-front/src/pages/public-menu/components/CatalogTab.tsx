import { useMemo, useState } from 'react';
import { ImageOff, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  PublicMenuItem,
  PublicMenuPromotion,
  PublicMenuResponse,
} from '@/types/publicMenu';
import {
  effectiveItemPrice,
  formatBrl,
  itemShowsStartingFrom,
  originalDisplayPrice,
  startingPriceFor,
} from '@/helpers/public-menu-helpers';
import { PromotionalBanners } from './PromotionalBanners';

interface Props {
  menu: PublicMenuResponse;
  onItemSelect: (item: PublicMenuItem) => void;
}

export function CatalogTab({ menu, onItemSelect }: Readonly<Props>) {
  return (
    <div>
      <PromotionalBanners promotions={menu.promotions} />

      {menu.promotions.length > 0 ? (
        <PromotionsSection
          promotions={menu.promotions}
          items={menu.items}
          onItemSelect={onItemSelect}
        />
      ) : null}

      <CategoriesSection menu={menu} onItemSelect={onItemSelect} />
    </div>
  );
}

function PromotionsSection({
  promotions,
  items,
  onItemSelect,
}: {
  promotions: PublicMenuPromotion[];
  items: PublicMenuItem[];
  onItemSelect: (item: PublicMenuItem) => void;
}) {
  const featured = promotions
    .map((p) => ({
      promo: p,
      item: items.find((it) => it.id === p.featuredItemId) ?? null,
    }))
    .filter(
      (entry): entry is { promo: PublicMenuPromotion; item: PublicMenuItem } =>
        entry.item != null && entry.promo.promotionalPrice != null,
    );
  if (featured.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Promoções
        </h2>
      </div>
      <div className="grid grid-cols-1 gap-3">
        {featured.map(({ promo, item }) => (
          <button
            type="button"
            key={promo.id}
            onClick={() =>
              onItemSelect({ ...item, price: promo.promotionalPrice ?? item.price })
            }
            className="w-full rounded-lg border border-border bg-card p-4 text-left shadow-soft-sm transition hover:bg-muted/30"
          >
            <div className="flex items-start gap-3">
              <ItemImage url={item.imageUrl} alt={item.name} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wide text-primary">
                  {promo.name}
                </p>
                <h3 className="mt-0.5 truncate font-medium text-foreground">{item.name}</h3>
                {promo.message ? (
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {promo.message}
                  </p>
                ) : null}
                <div className="mt-2 flex items-end gap-2">
                  <span className="text-base font-semibold text-foreground">
                    {formatBrl(promo.promotionalPrice!)}
                  </span>
                  <span className="text-xs text-muted-foreground line-through">
                    {formatBrl(item.price)}
                  </span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function CategoriesSection({
  menu,
  onItemSelect,
}: {
  menu: PublicMenuResponse;
  onItemSelect: (item: PublicMenuItem) => void;
}) {
  const byCategory = useMemo(() => {
    const map = new Map<string, PublicMenuItem[]>();
    for (const it of menu.items) {
      const list = map.get(it.categoryId) ?? [];
      list.push(it);
      map.set(it.categoryId, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.position - b.position);
    }
    return map;
  }, [menu.items]);

  return (
    <div className="space-y-8">
      {menu.categories
        .sort((a, b) => a.position - b.position)
        .map((cat) => {
          const items = byCategory.get(cat.id) ?? [];
          if (items.length === 0) return null;
          return (
            <section key={cat.id}>
              <div className="mb-3">
                <h2 className="text-lg font-semibold tracking-tight">{cat.name}</h2>
                {cat.description ? (
                  <p className="text-sm text-muted-foreground">{cat.description}</p>
                ) : null}
              </div>
              <div className="grid grid-cols-1 gap-3">
                {items.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => onItemSelect(item)}
                    className={cn(
                      'flex w-full items-start gap-3 rounded-lg border border-border bg-card p-4 text-left shadow-soft-sm transition hover:bg-muted/30',
                    )}
                  >
                    <ItemImage url={item.imageUrl} alt={item.name} />
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-medium text-foreground">{item.name}</h3>
                      {item.description ? (
                        <p className="mt-1 line-clamp-2 whitespace-pre-line break-words text-xs text-muted-foreground">
                          {item.description}
                        </p>
                      ) : null}
                      <TilePrice item={item} />
                      {item.optionGroups.length > 0 ? (
                        <p className="mt-0.5 text-2xs text-muted-foreground">
                          Personalizável
                        </p>
                      ) : null}
                    </div>
                  </button>
                ))}
              </div>
            </section>
          );
        })}
    </div>
  );
}

function TilePrice({ item }: Readonly<{ item: PublicMenuItem }>) {
  const effective = effectiveItemPrice(item);
  const original = originalDisplayPrice(item);
  const hasStrike = original != null && original > effective;
  const floor = startingPriceFor(item);
  const hasFrom = itemShowsStartingFrom(item);
  return (
    <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      {hasFrom ? (
        <span className="text-2xs uppercase tracking-wider text-muted-foreground">
          A partir de
        </span>
      ) : null}
      {hasStrike ? (
        <span className="text-xs text-muted-foreground line-through">
          {formatBrl(original)}
        </span>
      ) : null}
      <span
        className={cn(
          'text-sm font-semibold',
          hasStrike ? 'text-primary' : 'text-foreground',
        )}
      >
        {formatBrl(hasFrom ? floor : effective)}
      </span>
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
