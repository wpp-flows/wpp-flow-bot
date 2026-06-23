import { prisma } from "@/infrastructure/database/client";
import type {
    DeliveryMode,
    Order,
    OrderFilters,
    OrderItem,
    OrderRepository,
    OrderStatus,
    PaymentStatus,
    ServiceType,
} from "../order-repo";

const toOrder = (row: any): Order => ({
    id: row.id,
    organizationId: row.organizationId,
    customerId: row.customerId,
    conversationId: row.conversationId,
    sequence: row.sequence,
    items: (row.items as OrderItem[]) ?? [],
    subtotal: String(row.subtotal),
    discount: row.discount == null ? null : String(row.discount),
    total: String(row.total),
    status: row.status as OrderStatus,
    observation: row.observation,
    address: row.address,
    deliveryMode: (row.deliveryMode ?? "DELIVERY") as DeliveryMode,
    deliveryFee: row.deliveryFee != null ? String(row.deliveryFee) : "0",
    couponCode: row.couponCode ?? null,
    couponDiscount:
        row.couponDiscount == null ? null : String(row.couponDiscount),
    paymentStatus: row.paymentStatus as PaymentStatus,
    paymentProvider: row.paymentProvider,
    paymentProviderRef: row.paymentProviderRef,
    paymentLink: row.paymentLink ?? null,
    receiptUrl: row.receiptUrl,
    cashChangeFor: row.cashChangeFor == null ? null : String(row.cashChangeFor),
    serviceType: (row.serviceType ?? "DELIVERY") as ServiceType,
    tableId: row.tableId ?? null,
    tableLabel: row.tableLabel ?? null,
    billId: row.billId ?? null,
    customerName: row.customer?.name ?? null,
    appliedPromotionIds: (row.appliedPromotionIds as string[] | null) ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
});

const customerInclude = {
    customer: { select: { name: true } },
} as const;

export class PrismaOrderRepository implements OrderRepository {
    async listByOrg(
        organizationId: string,
        filters: OrderFilters,
    ): Promise<Order[]> {
        const rows = await prisma.order.findMany({
            where: {
                organizationId,
                ...(filters.status ? { status: filters.status } : {}),
                ...(filters.customerId ? { customerId: filters.customerId } : {}),
                ...(filters.serviceType ? { serviceType: filters.serviceType } : {}),
                ...(filters.tableId ? { tableId: filters.tableId } : {}),
                ...(filters.unbilledOnly ? { billId: null } : {}),
                ...(filters.fromDate || filters.toDate
                    ? {
                        createdAt: {
                            ...(filters.fromDate ? { gte: filters.fromDate } : {}),
                            ...(filters.toDate ? { lte: filters.toDate } : {}),
                        },
                    }
                    : {}),
            },
            include: customerInclude,
            orderBy: { createdAt: "desc" },
        });
        return rows.map(toOrder);
    }

    async findByIdInOrg(
        organizationId: string,
        id: string,
    ): Promise<Order | null> {
        const row = await prisma.order.findFirst({
            where: { id, organizationId },
            include: customerInclude,
        });
        return row ? toOrder(row) : null;
    }

    async findByOrgAndSequence(
        organizationId: string,
        sequence: number,
    ): Promise<Order | null> {
        const row = await prisma.order.findFirst({
            where: { organizationId, sequence },
            include: customerInclude,
        });
        return row ? toOrder(row) : null;
    }

    async findByProviderRef(
        provider: string,
        providerRef: string,
    ): Promise<Order | null> {
        const row = await prisma.order.findFirst({
            where: { paymentProvider: provider, paymentProviderRef: providerRef },
            include: customerInclude,
        });
        return row ? toOrder(row) : null;
    }

    async create(data: {
        organizationId: string;
        customerId: string;
        conversationId: string | null;
        items: OrderItem[];
        subtotal: number | string;
        discount?: number | string | null;
        total: number | string;
        observation?: string | null;
        address?: string | null;
        deliveryMode?: DeliveryMode;
        deliveryFee?: number | string;
        couponCode?: string | null;
        couponDiscount?: number | string | null;
        paymentStatus?: PaymentStatus;
        paymentProvider?: string | null;
        paymentProviderRef?: string | null;
        cashChangeFor?: number | string | null;
        serviceType?: ServiceType;
        tableId?: string | null;
        tableLabel?: string | null;
        appliedPromotionIds?: string[] | null;
    }): Promise<Order> {
        // Reserve a new per-org sequence inside a transaction so concurrent
        // confirmations can't collide on the unique (organizationId, sequence) index.
        const row = await prisma.$transaction(async (tx) => {
            const last = await tx.order.findFirst({
                where: { organizationId: data.organizationId },
                orderBy: { sequence: "desc" },
                select: { sequence: true },
            });
            const sequence = (last?.sequence ?? 0) + 1;
            return tx.order.create({
                data: {
                    organizationId: data.organizationId,
                    customerId: data.customerId,
                    conversationId: data.conversationId,
                    sequence,
                    items: data.items as any,
                    subtotal: data.subtotal,
                    discount: data.discount ?? null,
                    total: data.total,
                    observation: data.observation ?? null,
                    address: data.address ?? null,
                    deliveryMode: data.deliveryMode ?? "DELIVERY",
                    deliveryFee: data.deliveryFee ?? 0,
                    couponCode: data.couponCode ?? null,
                    couponDiscount: data.couponDiscount ?? null,
                    paymentStatus: data.paymentStatus ?? "PENDING",
                    paymentProvider: data.paymentProvider ?? null,
                    paymentProviderRef: data.paymentProviderRef ?? null,
                    cashChangeFor: data.cashChangeFor ?? null,
                    serviceType: data.serviceType ?? "DELIVERY",
                    tableId: data.tableId ?? null,
                    tableLabel: data.tableLabel ?? null,
                    appliedPromotionIds:
                        data.appliedPromotionIds && data.appliedPromotionIds.length > 0
                            ? (data.appliedPromotionIds as any)
                            : null,
                },
            });
        });
        return toOrder(row);
    }

    async updateStatus(id: string, status: OrderStatus): Promise<Order> {
        const row = await prisma.order.update({
            where: { id },
            data: { status },
        });
        return toOrder(row);
    }

    async updatePayment(id: string, data: any): Promise<Order> {
        const row = await prisma.order.update({
            where: { id },
            data,
        });
        return toOrder(row);
    }

    async updateDetails(
        id: string,
        data: Partial<{ observation: string | null; address: string | null }>,
    ): Promise<Order> {
        const row = await prisma.order.update({
            where: { id },
            data,
        });
        return toOrder(row);
    }

    async attachToBill(orderIds: string[], billId: string): Promise<number> {
        if (orderIds.length === 0) return 0;
        const result = await prisma.order.updateMany({
            where: { id: { in: orderIds } },
            data: {
                billId,
                status: "DELIVERED",
                paymentStatus: "PAID",
            },
        });
        return result.count;
    }

    async countByCoupon(
        organizationId: string,
        code: string,
    ): Promise<number> {
        const normalized = code.trim();
        if (!normalized) return 0;
        return prisma.order.count({
            where: {
                organizationId,
                couponCode: { equals: normalized, mode: "insensitive" },
                status: { not: "CANCELED" },
            },
        });
    }

    async countByCouponAndCustomer(
        organizationId: string,
        customerId: string,
        code: string,
    ): Promise<number> {
        const normalized = code.trim();
        if (!normalized) return 0;
        return prisma.order.count({
            where: {
                organizationId,
                customerId,
                couponCode: { equals: normalized, mode: "insensitive" },
                status: { not: "CANCELED" },
            },
        });
    }
}
