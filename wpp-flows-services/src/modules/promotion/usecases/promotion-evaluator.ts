import type { Promotion } from "../repositories/promotion-repo";

export interface DiscountResult {
    /** Decimal amount in BRL (e.g. 5.50). */
    amount: number;
    appliedPromotionIds: string[];
}

export interface CartItemForDiscount {
    itemId: string;
    /** Regular menu price at the time of order, as a decimal string. */
    price: string;
    qty: number;
}

export interface GreetingPromotion {
    /** The raw promotion (callers may want the id / featured item info). */
    promotion: Promotion;
    /** Final message text the runner should send. */
    message: string;
}

function dayMatches(promo: Promotion, day: number): boolean {
    return promo.daysOfWeek.length === 0 || promo.daysOfWeek.includes(day);
}

/**
 * Returns the discount that applies to an order being placed *now* by the given
 * customer. The customer's `orderCount` is the value BEFORE this order — the
 * Nth promotion fires when `orderCount + 1 === nthOrder`.
 *
 * Sources stacked additively:
 *  - NTH_ORDER_DISCOUNT: % or fixed BRL when the next order matches `nthOrder`.
 *  - DAILY_MESSAGE with featured item + promotional price: per-unit price diff
 *    times the qty of the featured item in the cart, on matching weekdays.
 *
 * Result is capped at the subtotal so total never goes negative.
 */
export function evaluateDiscount(input: {
    promotions: Promotion[];
    subtotal: number;
    customerOrderCount: number;
    cart?: CartItemForDiscount[];
    now?: Date;
}): DiscountResult {
    const nextOrderNumber = input.customerOrderCount + 1;
    const now = input.now ?? new Date();
    const day = now.getDay();
    const cart = input.cart ?? [];
    let total = 0;
    const applied: string[] = [];

    for (const promo of input.promotions) {
        if (!promo.isActive) continue;

        if (promo.kind === "NTH_ORDER_DISCOUNT") {
            if (!promo.nthOrder || promo.nthOrder <= 0) continue;
            if (nextOrderNumber !== promo.nthOrder) continue;
            if (!promo.discountType || promo.discountValue == null) continue;
            const value = Number.parseFloat(promo.discountValue);
            if (!Number.isFinite(value) || value <= 0) continue;

            if (promo.discountType === "PERCENT") {
                total += (input.subtotal * value) / 100;
            } else {
                total += value;
            }
            applied.push(promo.id);
            continue;
        }

        if (promo.kind === "DAILY_MESSAGE") {
            if (!promo.featuredItemId || promo.promotionalPrice == null) continue;
            if (!dayMatches(promo, day)) continue;
            const promoPrice = Number.parseFloat(promo.promotionalPrice);
            if (!Number.isFinite(promoPrice) || promoPrice < 0) continue;

            const lines = cart.filter((c) => c.itemId === promo.featuredItemId);
            if (lines.length === 0) continue;
            let diff = 0;
            for (const line of lines) {
                const regular = Number.parseFloat(line.price || "0");
                if (!Number.isFinite(regular)) continue;
                // Only discount when the promo price is lower than the regular price.
                const perUnit = Math.max(0, regular - promoPrice);
                diff += perUnit * line.qty;
            }
            if (diff > 0) {
                total += diff;
                applied.push(promo.id);
            }
        }
    }

    const capped = Math.min(total, input.subtotal);
    return {
        amount: Math.round(capped * 100) / 100,
        appliedPromotionIds: applied,
    };
}

/**
 * Returns the promotions whose greeting messages should be prepended to the
 * next menu for this customer right now, paired with the raw promotion so the
 * caller can resolve featured-item details (it would otherwise need to re-scan
 * the active list).
 *
 *  - Daily promo: posted on its scheduled days.
 *  - Teaser: posted on the order *before* (or N before) a qualifying Nth-order discount.
 */
export function evaluateGreetingPromotions(input: {
    promotions: Promotion[];
    customerOrderCount: number;
    now?: Date;
}): GreetingPromotion[] {
    const now = input.now ?? new Date();
    const day = now.getDay();
    const nextOrderNumber = input.customerOrderCount + 1;
    const out: GreetingPromotion[] = [];

    for (const promo of input.promotions) {
        if (!promo.isActive) continue;

        if (promo.kind === "DAILY_MESSAGE") {
            if (!promo.message) continue;
            if (!dayMatches(promo, day)) continue;
            out.push({ promotion: promo, message: promo.message });
            continue;
        }

        if (promo.kind === "NTH_ORDER_DISCOUNT") {
            if (
                promo.teaserMessage &&
                promo.nthOrder &&
                promo.teaserOrderOffset &&
                promo.teaserOrderOffset > 0
            ) {
                const teaserAt = promo.nthOrder - promo.teaserOrderOffset;
                if (teaserAt > 0 && nextOrderNumber === teaserAt) {
                    out.push({ promotion: promo, message: promo.teaserMessage });
                }
            }
        }
    }
    return out;
}

/**
 * Back-compat shim — existing callers that only need raw strings keep working.
 * Prefer {@link evaluateGreetingPromotions} when you also need the promotion
 * metadata (e.g. featured item id).
 */
export function evaluateGreetingMessages(input: {
    promotions: Promotion[];
    customerOrderCount: number;
    now?: Date;
}): string[] {
    return evaluateGreetingPromotions(input).map((g) => g.message);
}
