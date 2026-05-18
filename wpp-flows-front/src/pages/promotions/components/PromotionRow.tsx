import { Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { Promotion } from '@/types';
import { DAY_LABELS } from '../promotions-constants';

interface Props {
  promo: Promotion;
  onEdit: () => void;
  onDelete: () => void;
}

export function PromotionRow({ promo, onEdit, onDelete }: Props) {
  const dailySchedule =
    promo.daysOfWeek.length > 0
      ? `Toda(s): ${promo.daysOfWeek.map((d) => DAY_LABELS[d]).join(', ')}`
      : 'Todos os dias';
  const dailyFeatured =
    promo.featuredItemId && promo.promotionalPrice
      ? ` · item destacado por R$ ${promo.promotionalPrice}`
      : promo.featuredItemId
        ? ' · com item destacado'
        : '';
  const summary =
    promo.kind === 'NTH_ORDER_DISCOUNT'
      ? `${promo.discountValue}${promo.discountType === 'PERCENT' ? '%' : ' BRL'} no ${promo.nthOrder}º pedido`
      : `${dailySchedule}${dailyFeatured}`;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold tracking-tight">{promo.name}</p>
          <Badge size="sm" tone={promo.isActive ? 'success' : 'neutral'} dot>
            {promo.isActive ? 'Ativa' : 'Inativa'}
          </Badge>
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{summary}</p>
      </div>
      <Button variant="ghost" size="sm" onClick={onEdit}>
        Editar
      </Button>
      <Button
        variant="ghost"
        size="sm"
        leftIcon={<Trash2 />}
        onClick={onDelete}
        className="text-destructive"
      >
        Excluir
      </Button>
    </div>
  );
}
