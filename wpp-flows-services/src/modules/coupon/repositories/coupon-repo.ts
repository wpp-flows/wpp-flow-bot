export type CouponDiscountType = "PERCENT" | "FIXED";

export interface Coupon {
    id: string;
    organizationId: string;
    code: string;
    discountType: CouponDiscountType;
    discountValue: string;
    isActive: boolean;
    validFrom: Date | null;
    validUntil: Date | null;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface CouponInput {
    code: string;
    discountType: CouponDiscountType;
    discountValue: number | string;
    isActive?: boolean;
    validFrom?: Date | null;
    validUntil?: Date | null;
    description?: string | null;
}

export interface CouponRepository {
    listByOrg(organizationId: string): Promise<Coupon[]>;
    findByIdInOrg(organizationId: string, id: string): Promise<Coupon | null>;
    findByCodeInOrg(organizationId: string, code: string): Promise<Coupon | null>;
    create(organizationId: string, data: CouponInput): Promise<Coupon>;
    update(id: string, data: Partial<CouponInput>): Promise<Coupon>;
    delete(id: string): Promise<void>;
}
