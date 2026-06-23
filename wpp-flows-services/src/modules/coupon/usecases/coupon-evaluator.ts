import type { Coupon } from "../repositories/coupon-repo";

export type CouponRejectionReason =
    | "NOT_FOUND"
    | "INACTIVE"
    | "OUT_OF_WINDOW"
    | "EXHAUSTED_TOTAL"
    | "EXHAUSTED_PER_CUSTOMER";

export interface CouponEvaluation {
    /** Decimal BRL amount the coupon shaves off `subtotal`. Capped at subtotal. */
    discount: number;
    coupon: Coupon;
}

export function evaluateCoupon(input: {
    coupon: Coupon | null;
    subtotal: number;
    now?: Date;
    totalUsageCount?: number;
    customerUsageCount?: number;
}): { ok: true; value: CouponEvaluation } | { ok: false; reason: CouponRejectionReason } {
    const { coupon } = input;
    if (!coupon) return { ok: false, reason: "NOT_FOUND" };
    if (!coupon.isActive) return { ok: false, reason: "INACTIVE" };

    const now = input.now ?? new Date();
    if (coupon.validFrom && now < coupon.validFrom) {
        return { ok: false, reason: "OUT_OF_WINDOW" };
    }
    if (coupon.validUntil && now > coupon.validUntil) {
        return { ok: false, reason: "OUT_OF_WINDOW" };
    }

    if (
        coupon.maxUses != null &&
        input.totalUsageCount != null &&
        input.totalUsageCount >= coupon.maxUses
    ) {
        return { ok: false, reason: "EXHAUSTED_TOTAL" };
    }
    if (
        coupon.maxUsesPerCustomer != null &&
        input.customerUsageCount != null &&
        input.customerUsageCount >= coupon.maxUsesPerCustomer
    ) {
        return { ok: false, reason: "EXHAUSTED_PER_CUSTOMER" };
    }

    const value = Number(coupon.discountValue);
    if (!Number.isFinite(value) || value <= 0) {
        return { ok: false, reason: "INACTIVE" };
    }
    const raw =
        coupon.discountType === "PERCENT" ? (input.subtotal * value) / 100 : value;
    const discount = Math.max(0, Math.min(raw, input.subtotal));
    return { ok: true, value: { discount, coupon } };
}

export function describeCouponRejection(reason: CouponRejectionReason): string {
    switch (reason) {
        case "NOT_FOUND":
            return "Cupom inválido.";
        case "INACTIVE":
            return "Este cupom não está mais ativo.";
        case "OUT_OF_WINDOW":
            return "Este cupom está fora da validade.";
        case "EXHAUSTED_TOTAL":
            return "Este cupom já atingiu o limite de usos.";
        case "EXHAUSTED_PER_CUSTOMER":
            return "Você já usou este cupom o máximo de vezes permitido.";
    }
}
