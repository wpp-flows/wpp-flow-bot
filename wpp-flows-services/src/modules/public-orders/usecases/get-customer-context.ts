import type { CustomerRepository } from "@/modules/customer/repositories/customer-repo";
import type { OrganizationRepository } from "@/modules/organization/repositories/organization-repo";
import type {
    Promotion,
    PromotionRepository,
} from "@/modules/promotion/repositories/promotion-repo";
import { NotFoundError } from "@/shared/exceptions/http";

export type CustomerContextBannerKind = "QUALIFYING" | "TEASER";

export interface CustomerContextBanner {
    promotionId: string;
    kind: CustomerContextBannerKind;
    message: string;
    nthOrder: number;
    discountType: "PERCENT" | "FIXED";
    discountValue: string;
}

export interface CustomerContextResult {
    orderCount: number;
    nextOrderNumber: number;
    banners: CustomerContextBanner[];
}

export class GetCustomerContextUseCase {
    constructor(
        private readonly orgRepo: OrganizationRepository,
        private readonly customerRepo: CustomerRepository,
        private readonly promotionRepo: PromotionRepository,
    ) {}

    async execute(input: {
        slug: string;
        phone: string;
    }): Promise<CustomerContextResult> {
        const org = await this.orgRepo.findBySlug(input.slug);
        if (!org) throw new NotFoundError("Restaurant");

        const customer = await this.customerRepo.findByPhone(
            org.id,
            input.phone.trim(),
        );
        const orderCount = customer?.orderCount ?? 0;
        const nextOrderNumber = orderCount + 1;

        const promotions = await this.promotionRepo.listActive(org.id);
        const banners: CustomerContextBanner[] = [];
        for (const promo of promotions) {
            if (promo.kind !== "NTH_ORDER_DISCOUNT") continue;
            if (!promo.nthOrder || !promo.discountType || !promo.discountValue) continue;

            if (nextOrderNumber === promo.nthOrder) {
                banners.push({
                    promotionId: promo.id,
                    kind: "QUALIFYING",
                    message: promo.qualifyingMessage?.trim() || defaultQualifyingMessage(promo),
                    nthOrder: promo.nthOrder,
                    discountType: promo.discountType,
                    discountValue: promo.discountValue,
                });
                continue;
            }

            if (promo.teaserOrderOffset && promo.teaserMessage?.trim()) {
                const teaserAt = promo.nthOrder - promo.teaserOrderOffset;
                if (nextOrderNumber === teaserAt) {
                    banners.push({
                        promotionId: promo.id,
                        kind: "TEASER",
                        message: promo.teaserMessage.trim(),
                        nthOrder: promo.nthOrder,
                        discountType: promo.discountType,
                        discountValue: promo.discountValue,
                    });
                }
            }
        }

        return { orderCount, nextOrderNumber, banners };
    }
}

function defaultQualifyingMessage(promo: Promotion): string {
    const ordinal = `${promo.nthOrder}º`;
    const value = promo.discountType === "PERCENT"
        ? `${Number(promo.discountValue).toFixed(0)}%`
        : `R$ ${Number(promo.discountValue).toFixed(2).replace(".", ",")}`;
    return `🎉 ${ordinal} pedido — desconto de ${value} aplicado!`;
}
