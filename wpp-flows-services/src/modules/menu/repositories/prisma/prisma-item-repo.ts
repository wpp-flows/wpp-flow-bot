import { prisma } from "@/infrastructure/database/client";
import type { ItemRepository, MenuItem } from "../menu-repo";

const toModel = (row: any): MenuItem => ({
    ...row,
    price: row.price.toString(),
});

export class PrismaItemRepository implements ItemRepository {
    async listByOrg(organizationId: string): Promise<MenuItem[]> {
        const rows = await prisma.menuItem.findMany({
            where: { organizationId },
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
        name: string;
        description: string;
        price: number | string;
        imageUrl?: string;
        available?: boolean;
        position: number;
    }): Promise<MenuItem> {
        const row = await prisma.menuItem.create({
            data: {
                ...data,
                price: data.price.toString(),
            },
        });
        return toModel(row);
    }

    async update(
        id: string,
        data: {
            categoryId?: string;
            name?: string;
            description?: string;
            price?: number | string;
            imageUrl?: string | null;
            available?: boolean;
            position?: number;
        }
    ): Promise<MenuItem> {
        const row = await prisma.menuItem.update({
            where: { id },
            data: {
                ...data,
                price: data.price === undefined ? undefined : data.price.toString(),
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
