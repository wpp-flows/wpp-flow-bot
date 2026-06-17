import {
    isWithinWorkingHours,
    workingHoursFor,
} from "@/modules/organization/working-hours";
import type { BotRepository } from "@/modules/bot/repositories/bot-repo";
import type { ConversationRepository } from "@/modules/chat/repositories/chat-repo";
import type { CouponRepository } from "@/modules/coupon/repositories/coupon-repo";
import {
    describeCouponRejection,
    evaluateCoupon,
} from "@/modules/coupon/usecases/coupon-evaluator";
import type { CustomerRepository } from "@/modules/customer/repositories/customer-repo";
import type { ItemRepository } from "@/modules/menu/repositories/menu-repo";
import type { OrganizationRepository } from "@/modules/organization/repositories/organization-repo";
import type { DeliveryMode, OrderRepository } from "@/modules/order/repositories/order-repo";
import type { CreateOrderFromCartUseCase } from "@/modules/order/usecases/order-usecases";
import type { CreatePaymentLinkUseCase } from "@/modules/payment/usecases/mercadopago-usecases";
import type { PromotionRepository } from "@/modules/promotion/repositories/promotion-repo";
import { evaluateDiscount } from "@/modules/promotion/usecases/promotion-evaluator";
import type { NotificationEmitter } from "@/modules/notification/usecases/notification-emitter";
import { paymentTimeoutScheduler } from "@/modules/webhook/usecases/flow/scheduler/payment-timeout-scheduler";
import { NotFoundError, ValidationError } from "@/shared/exceptions/http";
import { env } from "@/infrastructure/config/env";
import { orgEventBus } from "@/infrastructure/events/event-bus";
import type { TableRepository } from "@/modules/local-service/repositories/table-repo";

export interface PublicOrderItemAdditionalInput {
    id: string;
}

export interface PublicOrderItemInput {
    itemId: string;
    qty: number;
    notes?: string | null;
    additionals?: PublicOrderItemAdditionalInput[];
    bundle?: {
        bundleId: string;
        picks: { componentId: string; itemId: string }[];
        answers?: Record<string, string>;
    } | null;
}

export type PublicPaymentMethod = "MERCADOPAGO" | "CASH";

export interface CreatePublicOrderInput {
    slug: string;
    customer?: {
        name: string;
        phone: string;
    };
    items: PublicOrderItemInput[];
    observation?: string | null;
    address?: string | null;
    deliveryMode?: DeliveryMode;
    /** Customer-typed coupon code at checkout. Empty/whitespace = no coupon. */
    couponCode?: string | null;
    paymentMethod?: PublicPaymentMethod;
    cashChangeFor?: number | null;
    tableToken?: string | null;
    customerName?: string | null;
}

export interface CreatePublicOrderResult {
    orderId: string;
    orderNumber: string;
    paymentLink: string;
    total: string;
}

export class CreatePublicOrderUseCase {
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
        private readonly tableRepo: TableRepository,
    ) { }

    async execute(input: CreatePublicOrderInput): Promise<CreatePublicOrderResult> {
        const org = await this.orgRepo.findBySlug(input.slug);
        if (!org) throw new NotFoundError("Restaurant");

        const table = input.tableToken
            ? await this.tableRepo.findByToken(input.tableToken)
            : null;
        if (input.tableToken && (!table || table.organizationId !== org.id)) {
            throw new NotFoundError("Mesa");
        }
        const isLocal = !!table;

        const hours = workingHoursFor(org, isLocal ? "LOCAL" : "DELIVERY");
        if (!isWithinWorkingHours(hours)) {
            throw new ValidationError(
                isLocal
                    ? "O salão está fechado no momento. Tente novamente durante o horário de atendimento."
                    : "O restaurante está fechado no momento. Tente novamente durante o horário de funcionamento.",
            );
        }
        const bots = await this.botRepo.listByOrg(org.id);

        if (input.items.length === 0) {
            throw new ValidationError("Carrinho vazio.");
        }

        const cartItems = await Promise.all(
            input.items.map(async (entry) => {
                const item = await this.itemRepo.findByIdInOrg(org.id, entry.itemId);
                if (!item || !item.available) {
                    throw new ValidationError(
                        `Item ${entry.itemId} não está mais disponível.`,
                    );
                }
                const catalogAdditionals = new Map(
                    item.additionals.map((a) => [a.id, a]),
                );
                const additionals = (entry.additionals ?? [])
                    .map((a) => catalogAdditionals.get(a.id))
                    .filter((a): a is NonNullable<typeof a> => a != null)
                    .map((a) => ({ id: a.id, name: a.name, price: a.price }));
                return {
                    itemId: item.id,
                    name: item.name,
                    price: item.price,
                    qty: Math.max(1, Math.floor(entry.qty)),
                    notes: entry.notes?.trim() || null,
                    additionals,
                    bundle: entry.bundle
                        ? {
                            bundleId: entry.bundle.bundleId,
                            picks: entry.bundle.picks.map((p) => ({
                                componentId: p.componentId,
                                itemId: p.itemId,
                                itemName: "",
                            })),
                            answers: entry.bundle.answers ?? {},
                        }
                        : null,
                };
            }),
        );

        for (const ci of cartItems) {
            if (!ci.bundle) continue;
            for (const pick of ci.bundle.picks) {
                const picked = await this.itemRepo.findByIdInOrg(org.id, pick.itemId);
                pick.itemName = picked?.name ?? "Item";
            }
        }

        // LOCAL orders may omit `customer` — fabricate a per-table
        // synthetic with a non-phone unique key so the customer upsert
        // doesn't collide with real WhatsApp customers. DELIVERY orders
        // still require customer (the schema enforced that at the route).
        //
        // When the diner typed their name on the table menu, key theW
        // synthetic by (table, slug-of-name) so two people at the same
        // table get distinct customer rows — the dashboard kanban can
        // then show "Mesa 3 — João" vs "Mesa 3 — Maria" instead of
        // collapsing both into "Mesa 3".
        let customerInput: { name: string; phone: string };
        if (isLocal && table) {
            const typedName = input.customerName?.trim() || input.customer?.name?.trim() || "";
            if (typedName) {
                customerInput = {
                    name: typedName,
                    phone: `local:${table.id}:${slugifyName(typedName)}`,
                };
            } else {
                customerInput = {
                    name: `Mesa ${table.label}`,
                    phone: `local:${table.id}`,
                };
            }
        } else if (input.customer) {
            customerInput = {
                name: input.customer.name.trim() || input.customer.phone,
                phone: input.customer.phone.trim(),
            };
        } else {
            throw new ValidationError("Dados do cliente são obrigatórios.");
        }
        const customer = await this.customerRepo.upsert({
            organizationId: org.id,
            name: customerInput.name,
            phone: customerInput.phone,
        });

        const promotions = await this.promotionRepo.listActive(org.id);
        const subtotal = cartItems.reduce((sum, it) => {
            const extras = it.additionals.reduce(
                (acc, a) => acc + Number.parseFloat(a.price || "0"),
                0,
            );
            const base = Number.parseFloat(it.price || "0");
            return sum + (base + extras) * it.qty;
        }, 0);
        const { amount: promoDiscount, appliedPromotionIds } = evaluateDiscount({
            promotions,
            subtotal,
            customerOrderCount: customer.orderCount,
            cart: cartItems.map((c) => ({
                itemId: c.itemId,
                price: c.price,
                qty: c.qty,
            })),
        });

        const couponCodeRaw = input.couponCode?.trim();
        let couponDiscount = 0;
        let couponCode: string | null = null;
        if (couponCodeRaw) {
            const coupon = await this.couponRepo.findByCodeInOrg(
                org.id,
                couponCodeRaw,
            );
            const evaluation = evaluateCoupon({
                coupon,
                subtotal: Math.max(0, subtotal - promoDiscount),
            });
            if (!evaluation.ok) {
                throw new ValidationError(describeCouponRejection(evaluation.reason));
            }
            couponDiscount = evaluation.value.discount;
            couponCode = evaluation.value.coupon.code;
        }

        const discount = Math.min(promoDiscount + couponDiscount, subtotal);
        const deliveryFee =
            input.deliveryMode === "DELIVERY" ? Number(org.deliveryFee) : 0;

        let conversationId: string | null = null;
        if (!isLocal && input.customer) {
            const bot = bots.find((b) => b.status === "ONLINE") ?? bots[0] ?? null;
            if (bot) {
                const remoteJid = `${input.customer.phone.replace(/\D/g, "")}@s.whatsapp.net`;
                const conversation =
                    (await this.conversationRepo.findByBotAndRemoteJid(
                        bot.id,
                        remoteJid,
                    )) ??
                    (await this.conversationRepo.create({
                        organizationId: org.id,
                        botId: bot.id,
                        remoteJid,
                        contactName: customer.name,
                        contactPhone: customer.phone,
                    }));
                conversationId = conversation.id;
            }
        }

        const paymentMethod = input.paymentMethod ?? "MERCADOPAGO";
        const isCash = !isLocal && paymentMethod === "CASH";
        const deliveryModeForOrder = isLocal
            ? "PICKUP"
            : input.deliveryMode ?? "DELIVERY";

        const order = await this.createOrderFromCart.execute({
            organizationId: org.id,
            customerId: customer.id,
            conversationId,
            items: cartItems,
            observation: input.observation ?? null,
            address: isLocal
                ? null
                : deliveryModeForOrder === "DELIVERY"
                    ? input.address ?? null
                    : null,
            discount: discount > 0 ? discount : null,
            appliedPromotionIds: appliedPromotionIds.length
                ? appliedPromotionIds
                : null,
            deliveryMode: deliveryModeForOrder,
            deliveryFee: isLocal ? 0 : deliveryFee,
            couponCode,
            couponDiscount: couponDiscount > 0 ? couponDiscount : null,
            paymentProvider: isCash ? "CASH" : null,
            cashChangeFor: isCash ? input.cashChangeFor ?? null : null,
            serviceType: isLocal ? "LOCAL" : "DELIVERY",
            tableId: isLocal && table ? table.id : null,
            tableLabel: isLocal && table ? table.label : null,
        });

        if (isLocal && table) {
            await this.tableRepo.update(table.id, {
                status: table.status === "BILL_REQUESTED" ? "BILL_REQUESTED" : "OCCUPIED",
            });
        }

        let paymentLink: string;
        if (isLocal) {
            const base = (env.CLIENT_ORIGIN ?? "").replace(/\/$/, "");
            paymentLink = `${base}/r/${input.slug}/pedido/${order.id}`;
        } else if (isCash) {
            const base = (env.CLIENT_ORIGIN ?? "").replace(/\/$/, "");
            paymentLink = `${base}/r/${input.slug}/pedido/${order.id}`;
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
            tableId: table?.id ?? null,
            serviceType: isLocal ? "LOCAL" : "DELIVERY",
        });
        if (isLocal && table) {
            orgEventBus.emit(org.id, {
                kind: "table.updated",
                tableId: table.id,
            });
        }

        const sideLabel = isLocal ? " (mesa)" : isCash ? " (dinheiro)" : "";
        void this.notificationEmitter.emit({
            organizationId: org.id,
            type: "NEW_ORDER",
            title: `Novo pedido #${String(order.sequence).padStart(4, "0")}`,
            body: `${customer.name} — total R$ ${order.total}${sideLabel}`,
            link: isLocal
                ? `/local/tables/${table?.id ?? ""}`
                : `/orders?id=${order.id}`,
            requirePreference: "newOrders",
        });

        return {
            orderId: order.id,
            orderNumber: String(order.sequence).padStart(4, "0"),
            paymentLink,
            total: order.total,
        };
    }
}

function slugifyName(name: string): string {
    return name
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
        .slice(0, 60) || "anon";
}

