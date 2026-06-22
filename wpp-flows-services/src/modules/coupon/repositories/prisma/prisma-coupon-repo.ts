import { prisma } from "@/infrastructure/database/client";
import type {
    Coupon,
    CouponDiscountType,
    CouponInput,
    CouponRepository,
} from "../coupon-repo";

const toCoupon = (row: any): Coupon => ({
    id: row.id,
    organizationId: row.organizationId,
    code: row.code,
    discountType: row.discountType as CouponDiscountType,
    discountValue: String(row.discountValue),
    isActive: row.isActive,
    validFrom: row.validFrom,
    validUntil: row.validUntil,
    maxUses: row.maxUses ?? null,
    maxUsesPerCustomer: row.maxUsesPerCustomer ?? null,
    description: row.description ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
});

function normalizeInput(data: Partial<CouponInput>) {
    const out: Record<string, unknown> = {};
    if (data.code !== undefined) out.code = data.code.trim().toUpperCase();
    if (data.discountType !== undefined) out.discountType = data.discountType;
    if (data.discountValue !== undefined) out.discountValue = data.discountValue;
    if (data.isActive !== undefined) out.isActive = data.isActive;
    if (data.validFrom !== undefined) out.validFrom = data.validFrom;
    if (data.validUntil !== undefined) out.validUntil = data.validUntil;
    if (data.maxUses !== undefined) out.maxUses = data.maxUses;
    if (data.maxUsesPerCustomer !== undefined) {
        out.maxUsesPerCustomer = data.maxUsesPerCustomer;
    }
    if (data.description !== undefined) out.description = data.description;
    return out;
}

export class PrismaCouponRepository implements CouponRepository {
    async listByOrg(organizationId: string): Promise<Coupon[]> {
        const rows = await prisma.coupon.findMany({
            where: { organizationId },
            orderBy: { createdAt: "desc" },
        });
        return rows.map(toCoupon);
    }

    async findByIdInOrg(
        organizationId: string,
        id: string,
    ): Promise<Coupon | null> {
        const row = await prisma.coupon.findFirst({
            where: { id, organizationId },
        });
        return row ? toCoupon(row) : null;
    }

    async findByCodeInOrg(
        organizationId: string,
        code: string,
    ): Promise<Coupon | null> {
        const row = await prisma.coupon.findFirst({
            where: { organizationId, code: code.trim().toUpperCase() },
        });
        return row ? toCoupon(row) : null;
    }

    async create(
        organizationId: string,
        data: CouponInput,
    ): Promise<Coupon> {
        const row = await prisma.coupon.create({
            data: {
                organizationId,
                code: data.code.trim().toUpperCase(),
                discountType: data.discountType,
                discountValue: data.discountValue,
                isActive: data.isActive ?? true,
                validFrom: data.validFrom ?? null,
                validUntil: data.validUntil ?? null,
                maxUses: data.maxUses ?? null,
                maxUsesPerCustomer: data.maxUsesPerCustomer ?? null,
                description: data.description ?? null,
            },
        });
        return toCoupon(row);
    }

    async update(id: string, data: Partial<CouponInput>): Promise<Coupon> {
        const row = await prisma.coupon.update({
            where: { id },
            data: normalizeInput(data),
        });
        return toCoupon(row);
    }

    async delete(id: string): Promise<void> {
        await prisma.coupon.delete({ where: { id } });
    }
}
