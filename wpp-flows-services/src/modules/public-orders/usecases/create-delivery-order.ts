import { env } from "@/infrastructure/config/env";
import { orgEventBus } from "@/infrastructure/events/event-bus";
import {
    isWithinWorkingHours,
    workingHoursFor,
} from "@/modules/organization/working-hours";
import type { BotRepository } from "@/modules/bot/repositories/bot-repo";
import type { ConversationRepository } from "@/modules/chat/repositories/chat-repo";
import type { CouponRepository } from "@/modules/coupon/repositories/coupon-repo";
import type { CustomerRepository } from "@/modules/customer/repositories/customer-repo";
import type { ItemRepository } from "@/modules/menu/repositories/menu-repo";
import type { NotificationEmitter } from "@/modules/notification/usecases/notification-emitter";
import type { OrganizationRepository } from "@/modules/organization/repositories/organization-repo";
import type {
    DeliveryMode,
    OrderRepository,
} from "@/modules/order/repositories/order-repo";
import type { CreateOrderFromCartUseCase } from "@/modules/order/usecases/order-usecases";
import type { CreatePaymentLinkUseCase } from "@/modules/payment/usecases/mercadopago-usecases";
import type { PromotionRepository } from "@/modules/promotion/repositories/promotion-repo";
import { NotFoundError, ValidationError } from "@/shared/exceptions/http";
import { paymentTimeoutScheduler } from "@/modules/webhook/usecases/flow/scheduler/payment-timeout-scheduler";
import type { NotifyOrderReceivedUseCase } from "./notify-order-received";
import {
    computePricing,
    orderNumberOf,
    resolveCartItems,
    type PublicOrderItemInput,
    type PublicOrderResult,
} from "./shared";

export type DeliveryPaymentMethod = "MERCADOPAGO" | "CASH" | "DELIVERY_CARD_PIX";

export interface CreateDeliveryOrderInput {
    slug: string;
    customer: {
        name: string;
        phone: string;
    };
    items: PublicOrderItemInput[];
    observation?: string | null;
    address?: string | null;
    deliveryMode?: DeliveryMode;
    couponCode?: string | null;
    paymentMethod?: DeliveryPaymentMethod;
    cashChangeFor?: number | null;
}

export class CreateDeliveryOrderUseCase {
    constructor(
        private readonly orgRepo: OrganizationRepository,
        private readonly botRepo: BotRepository,
        private readonly itemRepo: ItemRepository,
        private readonly promotionRepo: PromotionRepository,
        private readonly couponRepo: CouponRepository,
        private readonly customerRepo: CustomerRepository,
        private readonly orderRepo: OrderRepository,
        private readonly conversationRepo: ConversationRepository,
        private readonly createOrderFromCart: CreateOrderFromCartUseCase,
        private readonly createPaymentLink: CreatePaymentLinkUseCase,
        private readonly notificationEmitter: NotificationEmitter,
        private readonly notifyOrderReceived: NotifyOrderReceivedUseCase,
    ) { }

    async execute(input: CreateDeliveryOrderInput): Promise<PublicOrderResult> {
        const org = await this.orgRepo.findBySlug(input.slug);
        if (!org) throw new NotFoundError("Restaurant");

        const hours = workingHoursFor(org, "DELIVERY");
        if (!isWithinWorkingHours(hours)) {
            throw new ValidationError(
                "O restaurante está fechado no momento. Tente novamente durante o horário de funcionamento.",
            );
        }

        if (!input.customer) {
            throw new ValidationError("Dados do cliente são obrigatórios.");
        }

        const cartItems = await resolveCartItems({
            orgId: org.id,
            serviceType: "DELIVERY",
            itemRepo: this.itemRepo,
            input: input.items,
        });

        const customer = await this.customerRepo.upsert({
            organizationId: org.id,
            name: input.customer.name.trim() || input.customer.phone,
            phone: input.customer.phone.trim(),
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

        const deliveryMode: DeliveryMode = input.deliveryMode ?? "DELIVERY";
        const deliveryFee = deliveryMode === "DELIVERY" ? Number(org.deliveryFee) : 0;
        const paymentMethod = input.paymentMethod ?? "MERCADOPAGO";
        const isCashOnDelivery = paymentMethod === "CASH";
        const isOnDelivery = isCashOnDelivery || paymentMethod === "DELIVERY_CARD_PIX";

        let conversationId: string | null = null;
        const bots = await this.botRepo.listByOrg(org.id);
        const bot = bots.find((b) => b.status === "ONLINE") ?? bots[0] ?? null;
        if (bot) {
            const remoteJid = `${input.customer.phone.replace(/\D/g, "")}@s.whatsapp.net`;
            const conversation =
                (await this.conversationRepo.findByBotAndRemoteJid(bot.id, remoteJid)) ??
                (await this.conversationRepo.create({
                    organizationId: org.id,
                    botId: bot.id,
                    remoteJid,
                    contactName: customer.name,
                    contactPhone: customer.phone,
                }));
            conversationId = conversation.id;
        }

        const order = await this.createOrderFromCart.execute({
            organizationId: org.id,
            customerId: customer.id,
            conversationId,
            items: cartItems,
            observation: input.observation ?? null,
            address: deliveryMode === "DELIVERY" ? input.address ?? null : null,
            discount: pricing.discount > 0 ? pricing.discount : null,
            appliedPromotionIds: pricing.appliedPromotionIds.length
                ? pricing.appliedPromotionIds
                : null,
            deliveryMode,
            deliveryFee,
            couponCode: pricing.couponCode,
            couponDiscount: pricing.couponDiscount > 0 ? pricing.couponDiscount : null,
            paymentProvider: isCashOnDelivery
                ? "CASH"
                : isOnDelivery
                    ? "DELIVERY_CARD_PIX"
                    : null,
            cashChangeFor: isCashOnDelivery ? input.cashChangeFor ?? null : null,
            serviceType: "DELIVERY",
            tableId: null,
            tableLabel: null,
        });

        let paymentLink: string;
        if (isOnDelivery) {
            paymentLink = `${cleanBase()}/r/${input.slug}/pedido/${order.id}`;
            void this.notifyOrderReceived.execute(order).catch((err) => {
                console.warn(
                    `notifyOrderReceived failed for cash order ${order.id}:`,
                    err,
                );
            });
        } else {
            const link = await this.createPaymentLink.execute({
                organizationId: org.id,
                orderId: order.id,
            });
            paymentLink = link.paymentLink;

            const timeoutMs = org.paymentTimeoutMinutes * 60 * 1000;
            await paymentTimeoutScheduler.schedule(
                { organizationId: org.id, orderId: order.id },
                timeoutMs,
            );
        }

        orgEventBus.emit(org.id, {
            kind: "order.created",
            orderId: order.id,
            tableId: null,
            serviceType: "DELIVERY",
        });

        const sideLabel = isCashOnDelivery
            ? " (dinheiro)"
            : isOnDelivery
                ? " (cartão/pix na entrega)"
                : "";
        void this.notificationEmitter.emit({
            organizationId: org.id,
            type: "NEW_ORDER",
            title: `Novo pedido #${orderNumberOf(order.sequence)}`,
            body: `${customer.name} — total R$ ${order.total}${sideLabel}`,
            link: `/orders?id=${order.id}`,
            requirePreference: "newOrders",
        });

        return {
            orderId: order.id,
            orderNumber: orderNumberOf(order.sequence),
            paymentLink,
            total: order.total,
        };
    }
}

function cleanBase(): string {
    return (env.CLIENT_ORIGIN ?? "").replace(/\/$/, "");
}
