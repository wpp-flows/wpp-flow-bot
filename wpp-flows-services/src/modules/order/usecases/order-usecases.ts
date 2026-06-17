import { NotFoundError, ValidationError } from "@/shared/exceptions/http";
import { orgEventBus } from "@/infrastructure/events/event-bus";
import type {
    DeliveryMode,
    Order,
    OrderFilters,
    OrderItem,
    OrderRepository,
    OrderStatus,
    ServiceType,
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

export class MarkOrderPaidUseCase {
    constructor(private readonly repo: OrderRepository) {}
    async execute(input: { organizationId: string; id: string }): Promise<Order> {
        const order = await this.repo.findByIdInOrg(input.organizationId, input.id);
        if (!order) throw new NotFoundError("Order");
        if (order.paymentStatus === "PAID") return order;
        const updated = await this.repo.updatePayment(input.id, {
            paymentStatus: "PAID",
        });
        orgEventBus.emit(input.organizationId, {
            kind: "order.updated",
            orderId: updated.id,
            tableId: updated.tableId,
            serviceType: updated.serviceType,
        });
        return updated;
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
        notifyCustomer?: boolean;
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
        orgEventBus.emit(input.organizationId, {
            kind: "order.updated",
            orderId: updated.id,
            tableId: updated.tableId,
            serviceType: updated.serviceType,
        });
        if (input.notifyCustomer !== false) {
            void this.notifyCustomer.execute(updated, input.status);
        }
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
        discount?: number | null;
        appliedPromotionIds?: string[] | null;
        deliveryMode?: DeliveryMode;
        deliveryFee?: number | null;
        couponCode?: string | null;
        couponDiscount?: number | null;
        paymentProvider?: string | null;
        cashChangeFor?: number | null;
        serviceType?: ServiceType;
        tableId?: string | null;
        tableLabel?: string | null;
    }): Promise<Order> {
        if (input.items.length === 0) {
            throw new ValidationError("Pedido vazio — adicione itens antes de confirmar.");
        }
        const subtotal = input.items.reduce(
            (sum, it) => sum + Number.parseFloat(it.price || "0") * it.qty,
            0,
        );
        const discount = Math.max(0, Math.min(input.discount ?? 0, subtotal));
        const deliveryFee = Math.max(0, input.deliveryFee ?? 0);
        const total = subtotal - discount + deliveryFee;
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
            deliveryMode: input.deliveryMode ?? "DELIVERY",
            deliveryFee: deliveryFee.toFixed(2),
            couponCode: input.couponCode ?? null,
            couponDiscount:
                input.couponDiscount && input.couponDiscount > 0
                    ? input.couponDiscount.toFixed(2)
                    : null,
            paymentProvider: input.paymentProvider ?? null,
            cashChangeFor:
                input.cashChangeFor && input.cashChangeFor > 0
                    ? input.cashChangeFor.toFixed(2)
                    : null,
            serviceType: input.serviceType ?? "DELIVERY",
            tableId: input.tableId ?? null,
            tableLabel: input.tableLabel ?? null,
            appliedPromotionIds: input.appliedPromotionIds ?? null,
        });
        await this.customerRepo.incrementOrderCount(input.customerId);
        return order;
    }
}
