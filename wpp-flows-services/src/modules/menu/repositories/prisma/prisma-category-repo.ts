import { prisma } from "@/infrastructure/database/client";
import type {
    CategoryRepository,
    MenuCategory,
} from "../menu-repo";

export class PrismaCategoryRepository implements CategoryRepository {
    async listByOrg(organizationId: string): Promise<MenuCategory[]> {
        return prisma.menuCategory.findMany({
            where: { organizationId },
            orderBy: { position: "asc" },
        });
    }

    async findByIdInOrg(
        organizationId: string,
        id: string
    ): Promise<MenuCategory | null> {
        return prisma.menuCategory.findFirst({ where: { id, organizationId } });
    }

    async create(data: {
        organizationId: string;
        name: string;
        description?: string;
        position: number;
    }): Promise<MenuCategory> {
        return prisma.menuCategory.create({ data });
    }

    async update(
        id: string,
        data: { name?: string; description?: string }
    ): Promise<MenuCategory> {
        return prisma.menuCategory.update({ where: { id }, data });
    }

    async delete(id: string): Promise<void> {
        await prisma.menuCategory.delete({ where: { id } });
    }

    async countByOrg(organizationId: string): Promise<number> {
        return prisma.menuCategory.count({ where: { organizationId } });
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
