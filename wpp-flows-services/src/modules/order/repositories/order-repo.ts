export type OrderStatus =
    | "RECEIVED"
    | "PREPARING"
    | "OUT_FOR_DELIVERY"
    | "DELIVERED"
    | "CANCELED";

export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED";

export type DeliveryMode = "PICKUP" | "DELIVERY";

export type ServiceType = "DELIVERY" | "LOCAL";

export interface OrderItemBundlePick {
    componentId: string;
    itemId: string;
    itemName: string;
}

/**
 * Bundle metadata attached to an order item that represents a completed BUNDLE
 * promotion. The order line still has a single price (the bundle's locked
 * price); this blob carries the picks + per-bundle question answers for
 * rendering on the order detail and receipts.
 */
export interface OrderItemBundle {
    bundleId: string;
    picks: OrderItemBundlePick[];
    answers: Record<string, string>;
}

export interface OrderItemAdditional {
    id: string;
    name: string;
    price: string;
}

export interface OrderItem {
    itemId: string;
    name: string;
    price: string;
    qty: number;
    notes?: string | null;
    additionals?: OrderItemAdditional[];
    bundle?: OrderItemBundle | null;
}

export interface Order {
    id: string;
    organizationId: string;
    customerId: string;
    conversationId: string | null;
    sequence: number;
    items: OrderItem[];
    subtotal: string;
    discount: string | null;
    total: string;
    status: OrderStatus;
    observation: string | null;
    address: string | null;
    deliveryMode: DeliveryMode;
    deliveryFee: string;
    couponCode: string | null;
    couponDiscount: string | null;
    paymentStatus: PaymentStatus;
    paymentProvider: string | null;
    paymentProviderRef: string | null;
    paymentLink: string | null;
    receiptUrl: string | null;
    cashChangeFor: string | null;
    serviceType: ServiceType;
    tableId: string | null;
    billId: string | null;
    customerName: string | null;
    appliedPromotionIds: string[] | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface OrderFilters {
    status?: OrderStatus;
    customerId?: string;
    search?: string;
    fromDate?: Date;
    toDate?: Date;
    serviceType?: ServiceType;
    tableId?: string;
    unbilledOnly?: boolean;
}

export interface OrderRepository {
    listByOrg(
        organizationId: string,
        filters: OrderFilters,
    ): Promise<Order[]>;
    findByIdInOrg(organizationId: string, id: string): Promise<Order | null>;
    findByOrgAndSequence(
        organizationId: string,
        sequence: number,
    ): Promise<Order | null>;
    findByProviderRef(
        provider: string,
        providerRef: string,
    ): Promise<Order | null>;
    /** Reserves the next per-org sequence number and creates the order in a single transaction. */
    create(data: {
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
        appliedPromotionIds?: string[] | null;
    }): Promise<Order>;
    updateStatus(id: string, status: OrderStatus): Promise<Order>;
    updatePayment(
        id: string,
        data: Partial<{
            paymentStatus: PaymentStatus;
            paymentProvider: string | null;
            paymentProviderRef: string | null;
            paymentLink: string | null;
            receiptUrl: string | null;
        }>,
    ): Promise<Order>;
    updateDetails(
        id: string,
        data: Partial<{ observation: string | null; address: string | null }>,
    ): Promise<Order>;
    attachToBill(orderIds: string[], billId: string): Promise<number>;
}
