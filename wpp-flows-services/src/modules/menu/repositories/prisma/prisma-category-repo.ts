import { prisma } from "@/infrastructure/database/client";
import type { ServiceType } from "@/modules/order/repositories/order-repo";
import type {
    CategoryRepository,
    MenuCategory,
} from "../menu-repo";

function toCategory(row: any): MenuCategory {
    return {
        id: row.id,
        organizationId: row.organizationId,
        serviceType: row.serviceType as ServiceType,
        name: row.name,
        description: row.description,
        position: row.position,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}

export class PrismaCategoryRepository implements CategoryRepository {
    async listByOrg(
        organizationId: string,
        filters: { serviceType?: ServiceType } = {},
    ): Promise<MenuCategory[]> {
        const rows = await prisma.menuCategory.findMany({
            where: {
                organizationId,
                ...(filters.serviceType ? { serviceType: filters.serviceType } : {}),
            },
            orderBy: { position: "asc" },
        });
        return rows.map(toCategory);
    }

    async findByIdInOrg(
        organizationId: string,
        id: string
    ): Promise<MenuCategory | null> {
        const row = await prisma.menuCategory.findFirst({
            where: { id, organizationId },
        });
        return row ? toCategory(row) : null;
    }

    async create(data: {
        organizationId: string;
        serviceType: ServiceType;
        name: string;
        description?: string;
        position: number;
    }): Promise<MenuCategory> {
        const row = await prisma.menuCategory.create({ data });
        return toCategory(row);
    }

    async update(
        id: string,
        data: { name?: string; description?: string }
    ): Promise<MenuCategory> {
        const row = await prisma.menuCategory.update({ where: { id }, data });
        return toCategory(row);
    }

    async delete(id: string): Promise<void> {
        await prisma.menuCategory.delete({ where: { id } });
    }

    async countByOrg(
        organizationId: string,
        filters: { serviceType?: ServiceType } = {},
    ): Promise<number> {
        return prisma.menuCategory.count({
            where: {
                organizationId,
                ...(filters.serviceType ? { serviceType: filters.serviceType } : {}),
            },
        });
    }

    async setPositions(orderedIds: string[]): Promise<void> {
        await prisma.$transaction(
            orderedIds.map((id, position) =>
                prisma.menuCategory.update({
                    where: { id },
                    data: { position },
                })
            )
        );
    }
}
