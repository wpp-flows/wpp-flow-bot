import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/infrastructure/database/client";
import type {
    BundleConfig,
    Promotion,
    PromotionDiscountType,
    PromotionInput,
    PromotionKind,
    PromotionRepository,
} from "../promotion-repo";

const toBundle = (raw: unknown): BundleConfig | null => {
    if (!raw || typeof raw !== "object") return null;
    const obj = raw as Partial<BundleConfig>;
    if (!Array.isArray(obj.components)) return null;
    return {
        components: obj.components,
        price: typeof obj.price === "string" ? obj.price : "0",
        questions: Array.isArray(obj.questions) ? obj.questions : [],
    };
};

const toPromotion = (row: any): Promotion => ({
    id: row.id,
    organizationId: row.organizationId,
    kind: row.kind as PromotionKind,
    name: row.name,
    isActive: row.isActive,
    nthOrder: row.nthOrder,
    discountType: row.discountType as PromotionDiscountType | null,
    discountValue: row.discountValue == null ? null : String(row.discountValue),
    daysOfWeek: (row.daysOfWeek as number[] | null) ?? [],
    message: row.message,
    featuredItemId: row.featuredItemId ?? null,
    promotionalPrice: row.promotionalPrice == null ? null : String(row.promotionalPrice),
    teaserOrderOffset: row.teaserOrderOffset,
    teaserMessage: row.teaserMessage,
    bundle: toBundle(row.bundle),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
});

export class PrismaPromotionRepository implements PromotionRepository {
    async listByOrg(organizationId: string): Promise<Promotion[]> {
        const rows = await prisma.promotion.findMany({
            where: { organizationId },
            orderBy: { createdAt: "desc" },
        });
        return rows.map(toPromotion);
    }

    async listActive(organizationId: string): Promise<Promotion[]> {
        const rows = await prisma.promotion.findMany({
            where: { organizationId, isActive: true },
            orderBy: { createdAt: "desc" },
        });
        return rows.map(toPromotion);
    }

    async findByIdInOrg(
        organizationId: string,
        id: string,
    ): Promise<Promotion | null> {
        const row = await prisma.promotion.findFirst({
            where: { id, organizationId },
        });
        return row ? toPromotion(row) : null;
    }

    async create(
        organizationId: string,
        data: PromotionInput,
    ): Promise<Promotion> {
        const row = await prisma.promotion.create({
            data: {
                organizationId,
                kind: data.kind,
                name: data.name,
                isActive: data.isActive ?? true,
                nthOrder: data.nthOrder ?? null,
                discountType: data.discountType ?? null,
                discountValue: data.discountValue ?? null,
                daysOfWeek: data.daysOfWeek ?? [],
                message: data.message ?? null,
                featuredItemId: data.featuredItemId ?? null,
                promotionalPrice: data.promotionalPrice ?? null,
                teaserOrderOffset: data.teaserOrderOffset ?? null,
                teaserMessage: data.teaserMessage ?? null,
                bundle: data.bundle
                    ? (data.bundle as unknown as Prisma.InputJsonValue)
                    : Prisma.DbNull,
            },
        });
        return toPromotion(row);
    }

    async update(id: string, data: Partial<PromotionInput>): Promise<Promotion> {
        const { bundle, ...rest } = data;
        const payload: Record<string, unknown> = { ...rest };
        if (bundle !== undefined) {
            payload.bundle = bundle ?? Prisma.DbNull;
        }
        const row = await prisma.promotion.update({
            where: { id },
            data: payload as any,
        });
        return toPromotion(row);
    }

    async delete(id: string): Promise<void> {
        await prisma.promotion.delete({ where: { id } });
    }
}
