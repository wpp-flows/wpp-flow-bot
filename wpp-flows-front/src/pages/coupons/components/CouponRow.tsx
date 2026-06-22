import { Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { Coupon } from '@/types';
import {
  formatCouponDiscount,
  formatCouponUsageLimit,
  formatCouponWindow,
} from '../helpers/coupons-helpers';

interface Props {
  coupon: Coupon;
  onEdit: () => void;
  onDelete: () => void;
}

export function CouponRow({ coupon, onEdit, onDelete }: Readonly<Props>) {
  const window = formatCouponWindow(coupon);
  const limit = formatCouponUsageLimit(coupon);
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-mono text-sm font-semibold tracking-tight">
            {coupon.code}
          </p>
          <Badge size="sm" tone={coupon.isActive ? 'success' : 'neutral'} dot>
            {coupon.isActive ? 'Ativo' : 'Inativo'}
          </Badge>
          <Badge size="sm" tone="info">
            {formatCouponDiscount(coupon)}
          </Badge>
          {limit ? (
            <Badge size="sm" tone="neutral">
              {limit}
            </Badge>
          ) : null}
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {[window, coupon.description].filter(Boolean).join(' · ') ||
            'Sem validade definida'}
        </p>
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
