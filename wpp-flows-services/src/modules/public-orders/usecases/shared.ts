import { evaluateCoupon, describeCouponRejection } from "@/modules/coupon/usecases/coupon-evaluator";
import type { CouponRepository } from "@/modules/coupon/repositories/coupon-repo";
import type { ItemRepository } from "@/modules/menu/repositories/menu-repo";
import type { OrderItem, ServiceType } from "@/modules/order/repositories/order-repo";
import type { PromotionRepository } from "@/modules/promotion/repositories/promotion-repo";
import { evaluateDiscount } from "@/modules/promotion/usecases/promotion-evaluator";
import { ValidationError } from "@/shared/exceptions/http";

export interface PublicOrderItemSelectionInput {
    groupId: string;
    optionIds: string[];
}

export interface PublicOrderItemInput {
    itemId: string;
    qty: number;
    notes?: string | null;
    selections?: PublicOrderItemSelectionInput[];
}

export interface PublicOrderResult {
    orderId: string;
    orderNumber: string;
    paymentLink: string;
    total: string;
}

export async function resolveCartItems(deps: {
    orgId: string;
    serviceType: ServiceType;
    itemRepo: ItemRepository;
    input: PublicOrderItemInput[];
}): Promise<OrderItem[]> {
    if (deps.input.length === 0) {
        throw new ValidationError("Carrinho vazio.");
    }

    const cartItems: OrderItem[] = await Promise.all(
        deps.input.map(async (entry) => {
            const item = await deps.itemRepo.findByIdInOrg(deps.orgId, entry.itemId);
            if (!item || !item.available) {
                throw new ValidationError(
                    `Item ${entry.itemId} não está mais disponível.`,
                );
            }
            if (item.serviceType !== deps.serviceType) {
                throw new ValidationError(
                    `Item ${entry.itemId} não pertence a este menu.`,
                );
            }

            const groupsById = new Map(item.optionGroups.map((g) => [g.id, g]));
            const selectionsByGroupId = new Map<string, string[]>();
            for (const sel of entry.selections ?? []) {
                // Dedup option IDs the client may have sent twice.
                selectionsByGroupId.set(sel.groupId, Array.from(new Set(sel.optionIds)));
            }

            const additionals: { id: string; name: string; price: string }[] = [];
            for (const group of item.optionGroups) {
                const picked = selectionsByGroupId.get(group.id) ?? [];
                if (picked.length < group.minSelections) {
                    throw new ValidationError(
                        `Grupo "${group.title}" requer ${group.minSelections} opção(ões).`,
                    );
                }
                if (picked.length > group.maxSelections) {
                    throw new ValidationError(
                        `Grupo "${group.title}" aceita no máximo ${group.maxSelections} opção(ões).`,
                    );
                }
                const optionsById = new Map(group.options.map((o) => [o.id, o]));
                for (const optionId of picked) {
                    const opt = optionsById.get(optionId);
                    if (!opt) {
                        throw new ValidationError(
                            `Opção inválida em "${group.title}".`,
                        );
                    }
                    additionals.push({
                        id: opt.id,
                        name: opt.name,
                        price: opt.additionalPrice,
                    });
                }
            }

            for (const sentGroupId of selectionsByGroupId.keys()) {
                if (!groupsById.has(sentGroupId)) {
                    throw new ValidationError(
                        `Grupo de opções desconhecido para ${item.name}.`,
                    );
                }
            }

            const chargedPrice = item.promotionalPrice ?? item.price;

            return {
                itemId: item.id,
                name: item.name,
                price: chargedPrice,
                qty: Math.max(1, Math.floor(entry.qty)),
                notes: entry.notes?.trim() || null,
                additionals,
            };
        }),
    );

    return cartItems;
}

export interface ResolvedPricing {
    subtotal: number;
    promoDiscount: number;
    couponDiscount: number;
    discount: number;
    couponCode: string | null;
    appliedPromotionIds: string[];
}

export async function computePricing(deps: {
    orgId: string;
    promotionRepo: PromotionRepository;
    couponRepo: CouponRepository;
    cartItems: OrderItem[];
    customerOrderCount: number;
    rawCouponCode?: string | null;
}): Promise<ResolvedPricing> {
    const subtotal = deps.cartItems.reduce((sum, it) => {
        const extras = (it.additionals ?? []).reduce(
            (acc, a) => acc + Number.parseFloat(a.price || "0"),
            0,
        );
        const base = Number.parseFloat(it.price || "0");
        return sum + (base + extras) * it.qty;
    }, 0);

    const promotions = await deps.promotionRepo.listActive(deps.orgId);
    const { amount: promoDiscount, appliedPromotionIds } = evaluateDiscount({
        promotions,
        subtotal,
        customerOrderCount: deps.customerOrderCount,
        cart: deps.cartItems.map((c) => ({
            itemId: c.itemId,
            price: c.price,
            qty: c.qty,
        })),
    });

    let couponDiscount = 0;
    let couponCode: string | null = null;
    const trimmed = deps.rawCouponCode?.trim();
    if (trimmed) {
        const coupon = await deps.couponRepo.findByCodeInOrg(deps.orgId, trimmed);
        const evaluation = evaluateCoupon({
            coupon,
            subtotal: Math.max(0, subtotal - promoDiscount),
        });
        if (!evaluation.ok) {
            throw new ValidationError(describeCouponRejection(evaluation.reason));
        }
        couponDiscount = evaluation.value.discount;
        couponCode = evaluation.value.coupon.code;
    }

    const discount = Math.min(promoDiscount + couponDiscount, subtotal);
    return {
        subtotal,
        promoDiscount,
        couponDiscount,
        discount,
        couponCode,
        appliedPromotionIds,
    };
}

export function orderNumberOf(sequence: number): string {
    return String(sequence).padStart(4, "0");
}

export function slugifyName(name: string): string {
    return (
        name
            .normalize("NFD")
            .replace(/[̀-ͯ]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "")
            .slice(0, 60) || "anon"
    );
}
