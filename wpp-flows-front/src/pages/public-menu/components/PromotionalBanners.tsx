import { Megaphone, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PublicMenuPromotion } from '@/types/publicMenu';

interface Props {
  promotions: PublicMenuPromotion[];
}

export function PromotionalBanners({ promotions }: Readonly<Props>) {
  const banners = promotions.filter((p) => {
    if (p.kind === 'DAILY_MESSAGE') {
      return !!p.message?.trim() && !p.featuredItemId;
    }
    if (p.kind === 'NTH_ORDER_DISCOUNT') {
      return !!p.message?.trim();
    }
    return false;
  });
  if (banners.length === 0) return null;

  return (
    <section className="mb-6 space-y-2">
      {banners.map((promo) => (
        <article
          key={promo.id}
          className={cn(
            'flex items-start gap-3 rounded-lg border p-3 text-sm',
            promo.kind === 'NTH_ORDER_DISCOUNT'
              ? 'border-primary/30 bg-primary/5'
              : 'border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/30',
          )}
        >
          <span
            className={cn(
              'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
              promo.kind === 'NTH_ORDER_DISCOUNT'
                ? 'bg-primary/15 text-primary'
                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
            )}
          >
            {promo.kind === 'NTH_ORDER_DISCOUNT' ? (
              <Sparkles className="h-4 w-4" />
            ) : (
              <Megaphone className="h-4 w-4" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
              {promo.name}
            </p>
            <p className="mt-0.5 whitespace-pre-line">{promo.message}</p>
          </div>
        </article>
      ))}
    </section>
  );
}
