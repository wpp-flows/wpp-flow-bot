import type { CouponRepository } from "@/modules/coupon/repositories/coupon-repo";
import {
    describeCouponRejection,
    evaluateCoupon,
} from "@/modules/coupon/usecases/coupon-evaluator";
import type { OrderRepository } from "@/modules/order/repositories/order-repo";
import type { OrganizationRepository } from "@/modules/organization/repositories/organization-repo";
import { NotFoundError, ValidationError } from "@/shared/exceptions/http";

export interface ValidatePublicCouponInput {
    slug: string;
    code: string;
    subtotal: number;
}

export interface ValidatePublicCouponResult {
    code: string;
    discountType: "PERCENT" | "FIXED";
    discountValue: string;
    discount: number;
}

export class ValidatePublicCouponUseCase {
    constructor(
        private readonly orgRepo: OrganizationRepository,
        private readonly couponRepo: CouponRepository,
        private readonly orderRepo: OrderRepository,
    ) { }

    async execute(
        input: ValidatePublicCouponInput,
    ): Promise<ValidatePublicCouponResult> {
        const org = await this.orgRepo.findBySlug(input.slug);
        if (!org) throw new NotFoundError("Restaurant");

        const code = input.code.trim();
        if (!code) throw new ValidationError("Informe um cupom.");

        const coupon = await this.couponRepo.findByCodeInOrg(org.id, code);

        const totalUsageCount = coupon
            ? await this.orderRepo.countByCoupon(org.id, coupon.code)
            : 0;

        const evaluation = evaluateCoupon({
            coupon,
            subtotal: Math.max(0, input.subtotal),
            totalUsageCount,
        });

        if (!evaluation.ok) {
            throw new ValidationError(describeCouponRejection(evaluation.reason));
        }

        return {
            code: evaluation.value.coupon.code,
            discountType: evaluation.value.coupon.discountType,
            discountValue: evaluation.value.coupon.discountValue,
            discount: evaluation.value.discount,
        };
    }
}

