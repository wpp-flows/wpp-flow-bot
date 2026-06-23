import { env } from "@/infrastructure/config/env";
import { orgEventBus } from "@/infrastructure/events/event-bus";
import {
    isWithinWorkingHours,
    workingHoursFor,
} from "@/modules/organization/working-hours";
import type { CouponRepository } from "@/modules/coupon/repositories/coupon-repo";
import type { CustomerRepository } from "@/modules/customer/repositories/customer-repo";
import type { ItemRepository } from "@/modules/menu/repositories/menu-repo";
import type { NotificationEmitter } from "@/modules/notification/usecases/notification-emitter";
import type { OrganizationRepository } from "@/modules/organization/repositories/organization-repo";
import type { OrderRepository } from "@/modules/order/repositories/order-repo";
import type { CreateOrderFromCartUseCase } from "@/modules/order/usecases/order-usecases";
import type { PromotionRepository } from "@/modules/promotion/repositories/promotion-repo";
import type { TableRepository } from "@/modules/local-service/repositories/table-repo";
import { NotFoundError, ValidationError } from "@/shared/exceptions/http";
import {
    computePricing,
    orderNumberOf,
    resolveCartItems,
    slugifyName,
    type PublicOrderItemInput,
    type PublicOrderResult,
} from "./shared";

export interface CreateLocalOrderInput {
    slug: string;
    tableToken: string;
    items: PublicOrderItemInput[];
    observation?: string | null;
    couponCode?: string | null;
    customerName?: string | null;
}

export class CreateLocalOrderUseCase {
    constructor(
        private readonly orgRepo: OrganizationRepository,
        private readonly itemRepo: ItemRepository,
        private readonly promotionRepo: PromotionRepository,
        private readonly couponRepo: CouponRepository,
        private readonly customerRepo: CustomerRepository,
        private readonly orderRepo: OrderRepository,
        private readonly tableRepo: TableRepository,
        private readonly createOrderFromCart: CreateOrderFromCartUseCase,
        private readonly notificationEmitter: NotificationEmitter,
    ) {}

    async execute(input: CreateLocalOrderInput): Promise<PublicOrderResult> {
        const org = await this.orgRepo.findBySlug(input.slug);
        if (!org) throw new NotFoundError("Restaurant");

        const table = await this.tableRepo.findByToken(input.tableToken);
        if (!table || table.organizationId !== org.id) {
            throw new NotFoundError("Mesa");
        }

        const hours = workingHoursFor(org, "LOCAL");
        if (!isWithinWorkingHours(hours)) {
            throw new ValidationError(
                "O salão está fechado no momento. Tente novamente durante o horário de atendimento.",
            );
        }

        const cartItems = await resolveCartItems({
            orgId: org.id,
            serviceType: "LOCAL",
            itemRepo: this.itemRepo,
            input: input.items,
        });

        const typedName = input.customerName?.trim() || "";
        const customer = await this.customerRepo.upsert({
            organizationId: org.id,
            name: typedName || `Mesa ${table.label}`,
            phone: typedName
                ? `local:${table.id}:${slugifyName(typedName)}`
                : `local:${table.id}`,
        });

        const pricing = await computePricing({
            orgId: org.id,
            promotionRepo: this.promotionRepo,
            couponRepo: this.couponRepo,
            orderRepo: this.orderRepo,
            cartItems,
            customerId: customer.id,
            customerOrderCount: customer.orderCount,
            rawCouponCode: input.couponCode,
        });

        const order = await this.createOrderFromCart.execute({
            organizationId: org.id,
            customerId: customer.id,
            conversationId: null,
            items: cartItems,
            observation: input.observation ?? null,
            address: null,
            discount: pricing.discount > 0 ? pricing.discount : null,
            appliedPromotionIds: pricing.appliedPromotionIds.length
                ? pricing.appliedPromotionIds
                : null,
            deliveryMode: "PICKUP",
            deliveryFee: 0,
            couponCode: pricing.couponCode,
            couponDiscount: pricing.couponDiscount > 0 ? pricing.couponDiscount : null,
            paymentProvider: null,
            cashChangeFor: null,
            serviceType: "LOCAL",
            tableId: table.id,
            tableLabel: table.label,
        });

        await this.tableRepo.update(table.id, {
            status: table.status === "BILL_REQUESTED" ? "BILL_REQUESTED" : "OCCUPIED",
        });

        orgEventBus.emit(org.id, {
            kind: "order.created",
            orderId: order.id,
            tableId: table.id,
            serviceType: "LOCAL",
        });
        orgEventBus.emit(org.id, {
            kind: "table.updated",
            tableId: table.id,
        });

        void this.notificationEmitter.emit({
            organizationId: org.id,
            type: "NEW_ORDER",
            title: `Novo pedido #${orderNumberOf(order.sequence)}`,
            body: `${customer.name} — total R$ ${order.total} (mesa)`,
            link: `/local/tables/${table.id}`,
            requirePreference: "newOrders",
        });

        const base = (env.CLIENT_ORIGIN ?? "").replace(/\/$/, "");
        return {
            orderId: order.id,
            orderNumber: orderNumberOf(order.sequence),
            paymentLink: `${base}/r/${input.slug}/pedido/${order.id}`,
            total: order.total,
        };
    }
}
