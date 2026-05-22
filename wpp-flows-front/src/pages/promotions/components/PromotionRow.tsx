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

export function PromotionRow({ promo, onEdit, onDelete }: Readonly<Props>) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold tracking-tight">{promo.name}</p>
          <Badge size="sm" tone={promo.isActive ? 'success' : 'neutral'} dot>
            {promo.isActive ? 'Ativa' : 'Inativa'}
          </Badge>
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{summarize(promo)}</p>
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

function summarize(promo: Promotion): string {
  switch (promo.kind) {
    case 'NTH_ORDER_DISCOUNT':
      return summarizeNthOrder(promo);
    case 'DAILY_MESSAGE':
      return summarizeDailyMessage(promo);
    case 'BUNDLE':
      return summarizeBundle(promo);
  }
}

function summarizeNthOrder(promo: Promotion): string {
  const unit = promo.discountType === 'PERCENT' ? '%' : ' BRL';
  return `${promo.discountValue}${unit} no ${promo.nthOrder}º pedido`;
}

function summarizeDailyMessage(promo: Promotion): string {
  const schedule =
    promo.daysOfWeek.length > 0
      ? `Toda(s): ${promo.daysOfWeek.map((d) => DAY_LABELS[d]).join(', ')}`
      : 'Todos os dias';
  return `${schedule}${featuredSuffix(promo)}`;
}

function featuredSuffix(promo: Promotion): string {
  if (!promo.featuredItemId) return '';
  if (promo.promotionalPrice) {
    return ` · item destacado por R$ ${promo.promotionalPrice}`;
  }
  return ' · com item destacado';
}

function summarizeBundle(promo: Promotion): string {
  const bundle = promo.bundle;
  if (!bundle) return '';
  const totalSlots = bundle.components.reduce((sum, c) => sum + c.count, 0);
  const itemsLabel = `${totalSlots} item${totalSlots === 1 ? '' : 's'}`;
  const poolsLabel = `${bundle.components.length} pool${bundle.components.length === 1 ? '' : 's'}`;
  return `R$ ${bundle.price} · ${itemsLabel} em ${poolsLabel}${bundleQuestionsSuffix(bundle.questions.length)}`;
}

function bundleQuestionsSuffix(count: number): string {
  if (count === 0) return '';
  return ` · ${count} pergunta${count === 1 ? '' : 's'}`;
}
