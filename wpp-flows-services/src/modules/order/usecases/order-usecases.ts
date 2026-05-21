import { NotFoundError, ValidationError } from "@/shared/exceptions/http";
import type {
    Order,
    OrderFilters,
    OrderItem,
    OrderRepository,
    OrderStatus,
} from "../repositories/order-repo";
import type { CustomerRepository } from "@/modules/customer/repositories/customer-repo";
import type { NotifyCustomerOrderStatusChangeUseCase } from "./notify-customer-status-change";

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
    RECEIVED: ["PREPARING", "CANCELED"],
    PREPARING: ["OUT_FOR_DELIVERY", "CANCELED"],
    OUT_FOR_DELIVERY: ["DELIVERED", "CANCELED"],
    DELIVERED: [],
    CANCELED: [],
};

export class ListOrdersUseCase {
    constructor(private readonly repo: OrderRepository) {}
    execute(input: {
        organizationId: string;
        filters: OrderFilters;
    }): Promise<Order[]> {
        return this.repo.listByOrg(input.organizationId, input.filters);
    }
}

export class GetOrderUseCase {
    constructor(private readonly repo: OrderRepository) {}
    async execute(input: { organizationId: string; id: string }): Promise<Order> {
        const order = await this.repo.findByIdInOrg(input.organizationId, input.id);
        if (!order) throw new NotFoundError("Order");
        return order;
    }
}

export class UpdateOrderStatusUseCase {
    constructor(
        private readonly repo: OrderRepository,
        private readonly notifyCustomer: NotifyCustomerOrderStatusChangeUseCase,
    ) {}
    async execute(input: {
        organizationId: string;
        id: string;
        status: OrderStatus;
    }): Promise<Order> {
        const order = await this.repo.findByIdInOrg(input.organizationId, input.id);
        if (!order) throw new NotFoundError("Order");

        if (order.status === input.status) return order;
        const allowed = ALLOWED_TRANSITIONS[order.status];
        if (!allowed.includes(input.status)) {
            throw new ValidationError(
                `Transição de ${order.status} para ${input.status} não é permitida.`,
            );
        }
        const updated = await this.repo.updateStatus(input.id, input.status);
        // Best-effort WhatsApp ping to the customer. Never blocks the status
        // update — the notifier swallows its own errors.
        void this.notifyCustomer.execute(updated, input.status);
        return updated;
    }
}

/**
 * Creates an order from the customer's flow cart at the moment of confirmation.
 * Also bumps the customer's order count so promotions like "your 5th order"
 * can read it on subsequent inbound messages.
 */
export class CreateOrderFromCartUseCase {
    constructor(
        private readonly orderRepo: OrderRepository,
        private readonly customerRepo: CustomerRepository,
    ) {}

    async execute(input: {
        organizationId: string;
        customerId: string;
        conversationId: string | null;
        items: OrderItem[];
        observation?: string | null;
        address?: string | null;
        /** Pre-computed discount in BRL (applied additively, capped at subtotal). */
        discount?: number | null;
        /** Promotion ids that produced the discount, for audit. */
        appliedPromotionIds?: string[] | null;
    }): Promise<Order> {
        if (input.items.length === 0) {
            throw new ValidationError("Pedido vazio — adicione itens antes de confirmar.");
        }
        const subtotal = input.items.reduce(
            (sum, it) => sum + Number.parseFloat(it.price || "0") * it.qty,
            0,
        );
        const discount = Math.max(0, Math.min(input.discount ?? 0, subtotal));
        const total = subtotal - discount;
        const order = await this.orderRepo.create({
            organizationId: input.organizationId,
            customerId: input.customerId,
            conversationId: input.conversationId,
            items: input.items,
            subtotal: subtotal.toFixed(2),
            discount: discount > 0 ? discount.toFixed(2) : null,
            total: total.toFixed(2),
            observation: input.observation ?? null,
            address: input.address ?? null,
            appliedPromotionIds: input.appliedPromotionIds ?? null,
        });
        await this.customerRepo.incrementOrderCount(input.customerId);
        return order;
    }
}
