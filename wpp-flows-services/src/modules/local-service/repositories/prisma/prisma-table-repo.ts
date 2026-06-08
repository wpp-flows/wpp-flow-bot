import { prisma } from "@/infrastructure/database/client";
import type {
    RestaurantTable,
    TableRepository,
    TableStatus,
} from "../table-repo";

function toTable(row: any): RestaurantTable {
    return {
        id: row.id,
        organizationId: row.organizationId,
        label: row.label,
        qrToken: row.qrToken,
        position: row.position ?? 0,
        seats: row.seats ?? null,
        notes: row.notes ?? null,
        status: (row.status ?? "EMPTY") as TableStatus,
        billRequestedAt: row.billRequestedAt ?? null,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}

export class PrismaTableRepository implements TableRepository {
    async listByOrg(organizationId: string): Promise<RestaurantTable[]> {
        const rows = await prisma.restaurantTable.findMany({
            where: { organizationId },
            orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        });
        return rows.map(toTable);
    }

    async findByIdInOrg(
        organizationId: string,
        id: string,
    ): Promise<RestaurantTable | null> {
        const row = await prisma.restaurantTable.findFirst({
            where: { organizationId, id },
        });
        return row ? toTable(row) : null;
    }

    async findByToken(token: string): Promise<RestaurantTable | null> {
        const row = await prisma.restaurantTable.findUnique({
            where: { qrToken: token },
        });
        return row ? toTable(row) : null;
    }

    async create(data: {
        organizationId: string;
        label: string;
        qrToken: string;
        position?: number;
        seats?: number | null;
        notes?: string | null;
    }): Promise<RestaurantTable> {
        const row = await prisma.restaurantTable.create({
            data: {
                organizationId: data.organizationId,
                label: data.label,
                qrToken: data.qrToken,
                position: data.position ?? 0,
                seats: data.seats ?? null,
                notes: data.notes ?? null,
            },
        });
        return toTable(row);
    }

    async update(
        id: string,
        data: Partial<{
            label: string;
            position: number;
            seats: number | null;
            notes: string | null;
            status: TableStatus;
            billRequestedAt: Date | null;
            qrToken: string;
        }>,
    ): Promise<RestaurantTable> {
        const row = await prisma.restaurantTable.update({
            where: { id },
            data,
        });
        return toTable(row);
    }

    async delete(id: string): Promise<void> {
        await prisma.restaurantTable.delete({ where: { id } });
    }
}
