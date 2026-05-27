import type { Coupon, CouponDiscountType, CouponInput } from '@/types';

export interface CouponFormState {
  code: string;
  discountType: CouponDiscountType;
  discountValue: string;
  isActive: boolean;
  validFrom: string;
  validUntil: string;
  description: string;
}

export const emptyCouponForm: CouponFormState = {
  code: '',
  discountType: 'PERCENT',
  discountValue: '',
  isActive: true,
  validFrom: '',
  validUntil: '',
  description: '',
};

export function buildFormFromCoupon(coupon: Coupon): CouponFormState {
  return {
    code: coupon.code,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    isActive: coupon.isActive,
    validFrom: coupon.validFrom ? coupon.validFrom.slice(0, 10) : '',
    validUntil: coupon.validUntil ? coupon.validUntil.slice(0, 10) : '',
    description: coupon.description ?? '',
  };
}

export function validateCouponForm(
  form: CouponFormState,
): { ok: true } | { ok: false; error: string } {
  const code = form.code.trim();
  if (!code) return { ok: false, error: 'Informe o código do cupom.' };
  if (!/^[A-Z0-9_-]{2,40}$/i.test(code)) {
    return {
      ok: false,
      error: 'Use 2–40 letras, números, hífens ou _.',
    };
  }
  const value = Number(form.discountValue.replace(',', '.'));
  if (!Number.isFinite(value) || value <= 0) {
    return { ok: false, error: 'Informe o valor do desconto.' };
  }
  if (form.discountType === 'PERCENT' && value > 100) {
    return { ok: false, error: 'Desconto em % não pode passar de 100.' };
  }
  if (form.validFrom && form.validUntil && form.validFrom > form.validUntil) {
    return { ok: false, error: 'A data de início é posterior à data de fim.' };
  }
  return { ok: true };
}

export function buildCouponPayload(form: CouponFormState): CouponInput {
  return {
    code: form.code.trim().toUpperCase(),
    discountType: form.discountType,
    discountValue: Number(form.discountValue.replace(',', '.')),
    isActive: form.isActive,
    validFrom: form.validFrom ? new Date(form.validFrom).toISOString() : null,
    validUntil: form.validUntil
      ? new Date(`${form.validUntil}T23:59:59`).toISOString()
      : null,
    description: form.description.trim() || null,
  };
}

export function formatCouponDiscount(coupon: Coupon): string {
  const value = Number(coupon.discountValue);
  if (coupon.discountType === 'PERCENT') {
    return `${value.toFixed(0)}% off`;
  }
  return `R$ ${value.toFixed(2).replace('.', ',')} off`;
}

export function formatCouponWindow(coupon: Coupon): string | null {
  if (!coupon.validFrom && !coupon.validUntil) return null;
  const from = coupon.validFrom ? formatDateShort(coupon.validFrom) : '—';
  const until = coupon.validUntil ? formatDateShort(coupon.validUntil) : '—';
  return `${from} → ${until}`;
}

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
}
