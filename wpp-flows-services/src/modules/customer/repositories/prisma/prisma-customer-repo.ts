import { prisma } from "@/infrastructure/database/client";
import type {
    Customer,
    CustomerRepository,
    SavedAddress,
} from "../customer-repo";

const toCustomer = (row: any): Customer => ({
    id: row.id,
    organizationId: row.organizationId,
    name: row.name,
    phone: row.phone,
    orderCount: row.orderCount,
    savedAddresses: (row.savedAddresses as SavedAddress[] | null) ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
});

export class PrismaCustomerRepository implements CustomerRepository {
    async listByOrg(organizationId: string): Promise<Customer[]> {
        const rows = await prisma.customer.findMany({
            where: { organizationId },
            orderBy: { updatedAt: "desc" },
        });
        return rows.map(toCustomer);
    }

    async findByIdInOrg(
        organizationId: string,
        id: string,
    ): Promise<Customer | null> {
        const row = await prisma.customer.findFirst({
            where: { id, organizationId },
        });
        return row ? toCustomer(row) : null;
    }

    async findByPhone(
        organizationId: string,
        phone: string,
    ): Promise<Customer | null> {
        const row = await prisma.customer.findUnique({
            where: { organizationId_phone: { organizationId, phone } },
        });
        return row ? toCustomer(row) : null;
    }

    async upsert(data: {
        organizationId: string;
        name: string;
        phone: string;
    }): Promise<Customer> {
        const row = await prisma.customer.upsert({
            where: {
                organizationId_phone: {
                    organizationId: data.organizationId,
                    phone: data.phone,
                },
            },
            update: {},
            create: {
                organizationId: data.organizationId,
                name: data.name,
                phone: data.phone,
            },
        });
        return toCustomer(row);
    }

    async update(id: string, data: any): Promise<Customer> {
        const row = await prisma.customer.update({
            where: { id },
            data,
        });
        return toCustomer(row);
    }

    async incrementOrderCount(id: string): Promise<Customer> {
        const row = await prisma.customer.update({
            where: { id },
            data: { orderCount: { increment: 1 } },
        });
        return toCustomer(row);
    }
}
