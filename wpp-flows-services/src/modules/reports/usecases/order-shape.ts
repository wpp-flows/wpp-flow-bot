import type { Order } from "@/modules/order/repositories/order-repo";

export function toOrderShape(row: any): Order {
    return {
        id: row.id,
        organizationId: row.organizationId,
        customerId: row.customerId,
        conversationId: row.conversationId,
        sequence: row.sequence,
        items: row.items ?? [],
        subtotal: String(row.subtotal),
        discount: row.discount == null ? null : String(row.discount),
        total: String(row.total),
        status: row.status,
        observation: row.observation,
        address: row.address,
        deliveryMode: row.deliveryMode ?? "DELIVERY",
        deliveryFee: row.deliveryFee != null ? String(row.deliveryFee) : "0",
        couponCode: row.couponCode ?? null,
        couponDiscount:
            row.couponDiscount == null ? null : String(row.couponDiscount),
        paymentStatus: row.paymentStatus,
        paymentProvider: row.paymentProvider,
        paymentProviderRef: row.paymentProviderRef,
        paymentLink: row.paymentLink ?? null,
        receiptUrl: row.receiptUrl,
        cashChangeFor:
            row.cashChangeFor == null ? null : String(row.cashChangeFor),
        serviceType: (row.serviceType ?? "DELIVERY") as
            | "DELIVERY"
            | "LOCAL",
        tableId: row.tableId ?? null,
        tableLabel: row.tableLabel ?? null,
        billId: row.billId ?? null,
        customerName: row.customer?.name ?? null,
        appliedPromotionIds: (row.appliedPromotionIds as string[] | null) ?? null,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}
