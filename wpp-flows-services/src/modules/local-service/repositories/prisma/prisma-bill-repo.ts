import { prisma } from "@/infrastructure/database/client";
import type { BillRepository, TableBill } from "../bill-repo";

function toBill(row: any): TableBill {
    return {
        id: row.id,
        organizationId: row.organizationId,
        tableId: row.tableId,
        total: String(row.total),
        paymentMethod: row.paymentMethod,
        notes: row.notes ?? null,
        closedAt: row.closedAt,
        closedById: row.closedById,
        createdAt: row.createdAt,
    };
}

export class PrismaBillRepository implements BillRepository {
    async listByOrg(organizationId: string): Promise<TableBill[]> {
        const rows = await prisma.tableBill.findMany({
            where: { organizationId },
            orderBy: { closedAt: "desc" },
        });
        return rows.map(toBill);
    }

    async listByTable(tableId: string): Promise<TableBill[]> {
        const rows = await prisma.tableBill.findMany({
            where: { tableId },
            orderBy: { closedAt: "desc" },
        });
        return rows.map(toBill);
    }

    async findById(id: string): Promise<TableBill | null> {
        const row = await prisma.tableBill.findUnique({ where: { id } });
        return row ? toBill(row) : null;
    }

    async create(data: {
        organizationId: string;
        tableId: string;
        total: number | string;
        paymentMethod: string;
        notes?: string | null;
        closedById: string;
    }): Promise<TableBill> {
        const row = await prisma.tableBill.create({
            data: {
                organizationId: data.organizationId,
                tableId: data.tableId,
                total: data.total,
                paymentMethod: data.paymentMethod,
                notes: data.notes ?? null,
                closedById: data.closedById,
            },
        });
        return toBill(row);
    }
}
