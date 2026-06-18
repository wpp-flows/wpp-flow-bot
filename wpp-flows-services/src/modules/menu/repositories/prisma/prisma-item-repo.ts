import { prisma } from "@/infrastructure/database/client";
import type { ServiceType } from "@/modules/order/repositories/order-repo";
import type {
    ItemRepository,
    MenuItem,
    MenuItemAdditional,
} from "../menu-repo";

function toAdditionals(raw: unknown): MenuItemAdditional[] {
    if (!Array.isArray(raw)) return [];
    return raw
        .filter((a): a is { id: unknown; name: unknown; price: unknown } =>
            !!a && typeof a === "object",
        )
        .map((a) => ({
            id: String((a as { id?: unknown }).id ?? ""),
            name: String((a as { name?: unknown }).name ?? ""),
            price: String((a as { price?: unknown }).price ?? "0"),
        }))
        .filter((a) => a.id && a.name);
}

const toModel = (row: any): MenuItem => ({
    id: row.id,
    organizationId: row.organizationId,
    categoryId: row.categoryId,
    serviceType: row.serviceType as ServiceType,
    name: row.name,
    description: row.description,
    price: row.price.toString(),
    imageUrl: row.imageUrl,
    available: row.available,
    availableDaysOfWeek: (row.availableDaysOfWeek as number[] | null) ?? [],
    position: row.position,
    additionals: toAdditionals(row.additionals),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
});

export class PrismaItemRepository implements ItemRepository {
    async listByOrg(
        organizationId: string,
        filters: { serviceType?: ServiceType } = {},
    ): Promise<MenuItem[]> {
        const rows = await prisma.menuItem.findMany({
            where: {
                organizationId,
                ...(filters.serviceType ? { serviceType: filters.serviceType } : {}),
            },
            orderBy: [{ categoryId: "asc" }, { position: "asc" }],
        });
        return rows.map(toModel);
    }

    async listByCategory(categoryId: string): Promise<MenuItem[]> {
        const rows = await prisma.menuItem.findMany({
            where: { categoryId },
            orderBy: { position: "asc" },
        });
        return rows.map(toModel);
    }

    async findByIdInOrg(
        organizationId: string,
        id: string
    ): Promise<MenuItem | null> {
        const row = await prisma.menuItem.findFirst({
            where: { id, organizationId },
        });
        return row ? toModel(row) : null;
    }

    async create(data: {
        organizationId: string;
        categoryId: string;
        serviceType: ServiceType;
        name: string;
        description: string;
        price: number | string;
        imageUrl?: string;
        available?: boolean;
        availableDaysOfWeek?: number[];
        position: number;
        additionals?: MenuItemAdditional[];
    }): Promise<MenuItem> {
        const { additionals, ...rest } = data;
        const row = await prisma.menuItem.create({
            data: {
                ...rest,
                price: rest.price.toString(),
                additionals: (additionals ?? []) as any,
            },
        });
        return toModel(row);
    }

    async update(
        id: string,
        data: {
            categoryId?: string;
            serviceType?: ServiceType;
            name?: string;
            description?: string;
            price?: number | string;
            imageUrl?: string | null;
            available?: boolean;
            availableDaysOfWeek?: number[];
            position?: number;
            additionals?: MenuItemAdditional[];
        }
    ): Promise<MenuItem> {
        const { additionals, ...rest } = data;
        const row = await prisma.menuItem.update({
            where: { id },
            data: {
                ...rest,
                price: rest.price === undefined ? undefined : rest.price.toString(),
                ...(additionals !== undefined
                    ? { additionals: additionals as any }
                    : {}),
            },
        });
        return toModel(row);
    }

    async delete(id: string): Promise<void> {
        await prisma.menuItem.delete({ where: { id } });
    }

    async countByCategory(categoryId: string): Promise<number> {
        return prisma.menuItem.count({ where: { categoryId } });
    }

    async setPositions(orderedIds: string[]): Promise<void> {
        await prisma.$transaction(
            orderedIds.map((id, position) =>
                prisma.menuItem.update({ where: { id }, data: { position } })
            )
        );
    }
}
