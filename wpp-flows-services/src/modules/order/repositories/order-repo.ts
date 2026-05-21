export type OrderStatus =
    | "RECEIVED"
    | "PREPARING"
    | "OUT_FOR_DELIVERY"
    | "DELIVERED"
    | "CANCELED";

export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED";

export interface OrderItem {
    itemId: string;
    name: string;
    price: string;
    qty: number;
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
    paymentStatus: PaymentStatus;
    paymentProvider: string | null;
    paymentProviderRef: string | null;
    paymentLink: string | null;
    receiptUrl: string | null;
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
}

export interface OrderRepository {
    listByOrg(
        organizationId: string,
        filters: OrderFilters,
    ): Promise<Order[]>;
    findByIdInOrg(organizationId: string, id: string): Promise<Order | null>;
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
        paymentStatus?: PaymentStatus;
        paymentProvider?: string | null;
        paymentProviderRef?: string | null;
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
}
