import { env } from "@/infrastructure/config/env";
import {
    MercadoPagoClient,
    verifyMercadoPagoSignature,
} from "@/infrastructure/mercadopago/client";
import type { NotificationEmitter } from "@/modules/notification/usecases/notification-emitter";
import type { OrganizationRepository } from "@/modules/organization/repositories/organization-repo";
import type { OrderRepository } from "@/modules/order/repositories/order-repo";
import { NotFoundError, ValidationError } from "@/shared/exceptions/http";
import { paymentTimeoutScheduler } from "@/modules/webhook/usecases/flow/scheduler/payment-timeout-scheduler";
import type { WalletRepository } from "../repositories/wallet-repo";

/**
 * Builds the public URL Mercado Pago will hit on payment events. Resolved from
 * env.PUBLIC_API_URL so production and tunnel-based dev setups can override.
 */
function notificationUrl(organizationId: string): string | undefined {
    const base = env.PUBLIC_API_URL?.replace(/\/$/, "");
    if (!base) return undefined;
    return `${base}/webhook/mercadopago/${organizationId}`;
}

export class CreatePaymentLinkUseCase {
    constructor(
        private readonly orderRepo: OrderRepository,
        private readonly orgRepo: OrganizationRepository,
    ) { }

    /**
     * Generates a Mercado Pago Checkout Pro preference for an order and stores
     * the resulting link / external ref on it. Returns the public init_point.
     */
    async execute(input: {
        organizationId: string;
        orderId: string;
    }): Promise<{ paymentLink: string; preferenceId: string }> {
        const order = await this.orderRepo.findByIdInOrg(
            input.organizationId,
            input.orderId,
        );
        if (!order) throw new NotFoundError("Order");
        if (order.paymentStatus === "PAID") {
            throw new ValidationError("Pedido já pago.");
        }

        const org = await this.orgRepo.findById(input.organizationId);
        if (!org?.mercadoPagoAccessToken) {
            throw new ValidationError(
                "Mercado Pago não configurado para esta organização.",
            );
        }
        const client = new MercadoPagoClient(org.mercadoPagoAccessToken);
        const preference = await client.createPreference({
            external_reference: order.id,
            items: order.items.map((it) => ({
                title: it.name,
                quantity: it.qty,
                unit_price: Number.parseFloat(it.price),
                currency_id: "BRL",
            })),
            notification_url: notificationUrl(input.organizationId),
            statement_descriptor: org.name.slice(0, 22),
        });

        const link = preference.init_point;
        await this.orderRepo.updatePayment(order.id, {
            paymentProvider: "MERCADO_PAGO",
            paymentProviderRef: preference.id,
            paymentLink: link,
        });
        return { paymentLink: link, preferenceId: preference.id };
    }
}

/**
 * Processes a Mercado Pago webhook event. MP sends a thin payload pointing at a
 * resource id; we fetch the full payment, match it back to our Order via
 * `external_reference`, and update payment + wallet accordingly.
 *
 * Idempotent on the (orderId, paymentStatus) tuple: repeat webhook calls won't
 * double-credit the wallet.
 */
export class HandleMercadoPagoWebhookUseCase {
    constructor(
        private readonly orderRepo: OrderRepository,
        private readonly orgRepo: OrganizationRepository,
        private readonly walletRepo: WalletRepository,
        private readonly notificationEmitter: NotificationEmitter,
    ) { }

    async execute(input: {
        organizationId: string;
        body: unknown;
        /** Headers used to verify origin when the org configured a webhook secret. */
        headers?: {
            signature?: string;
            requestId?: string;
        };
    }): Promise<{ orderId: string | null; paid: boolean }> {
        const event = parseWebhookEvent(input.body);
        if (!event || event.type !== "payment") {
            return { orderId: null, paid: false };
        }

        const org = await this.orgRepo.findById(input.organizationId);
        if (!org?.mercadoPagoAccessToken) {
            throw new ValidationError(
                "Mercado Pago não configurado para esta organização.",
            );
        }

        // When the org configured a webhook secret, MP-signed calls are the only
        // ones we trust. Unsigned or invalid-signature calls are dropped silently.
        if (org.mercadoPagoWebhookSecret) {
            const ok = verifyMercadoPagoSignature({
                secret: org.mercadoPagoWebhookSecret,
                signatureHeader: input.headers?.signature,
                requestId: input.headers?.requestId,
                dataId: event.paymentId,
            });
            if (!ok) {
                console.warn(
                    `Mercado Pago webhook signature mismatch for org=${input.organizationId}; dropping event.`,
                );
                return { orderId: null, paid: false };
            }
        }

        const client = new MercadoPagoClient(org.mercadoPagoAccessToken);
        const payment = await client.getPayment(event.paymentId);
        if (!payment.external_reference) {
            return { orderId: null, paid: false };
        }

        const order = await this.orderRepo.findByIdInOrg(
            input.organizationId,
            payment.external_reference,
        );
        if (!order) return { orderId: null, paid: false };

        if (payment.status === "approved") {
            paymentTimeoutScheduler.clear(order.id);
            if (order.paymentStatus !== "PAID") {
                await this.orderRepo.updatePayment(order.id, {
                    paymentStatus: "PAID",
                    paymentProvider: "MERCADO_PAGO",
                    paymentProviderRef: String(payment.id),
                    receiptUrl: null,
                });
                const wallet = await this.walletRepo.getOrCreate(input.organizationId);
                await this.walletRepo.appendTransaction({
                    walletId: wallet.id,
                    kind: "CREDIT",
                    amount: payment.transaction_amount,
                    status: "COMPLETED",
                    orderId: order.id,
                    note: `Pedido #${String(order.sequence).padStart(4, "0")}`,
                });
                void this.notificationEmitter.emit({
                    organizationId: input.organizationId,
                    type: "PAYMENT_RECEIVED",
                    title: `Pagamento recebido — pedido #${String(order.sequence).padStart(4, "0")}`,
                    body: `R$ ${payment.transaction_amount.toFixed(2).replace(".", ",")} creditado na carteira.`,
                    link: `/orders?id=${order.id}`,
                    // No preference gate — payment confirmations are always shown.
                });
            }
            return { orderId: order.id, paid: true };
        }

        if (
            payment.status === "rejected" ||
            payment.status === "cancelled" ||
            payment.status === "refunded"
        ) {
            await this.orderRepo.updatePayment(order.id, {
                paymentStatus: payment.status === "refunded" ? "REFUNDED" : "FAILED",
            });

            if (payment.status === "rejected" || payment.status === "cancelled") {
                const timeoutMs = org.paymentTimeoutMinutes * 60 * 1000;
                await paymentTimeoutScheduler.schedule(
                    { organizationId: input.organizationId, orderId: order.id },
                    timeoutMs,
                );
            }
        }
        return { orderId: order.id, paid: false };
    }
}

interface ParsedWebhookEvent {
    type: "payment" | "merchant_order" | string;
    paymentId: string;
}

function parseWebhookEvent(body: unknown): ParsedWebhookEvent | null {
    // MP sends a few shapes. We support the "type=payment, data.id=<id>" one
    // used by Checkout Pro notifications, plus the legacy query-param style.
    const b = body as
        | {
            type?: string;
            action?: string;
            data?: { id?: string | number };
            resource?: string;
            topic?: string;
        }
        | null;
    if (!b) return null;
    const id = b.data?.id ?? extractIdFromResource(b.resource);
    if (!id) return null;
    const type = b.type ?? b.topic ?? (b.action?.startsWith("payment.") ? "payment" : "");
    if (!type) return null;
    return { type, paymentId: String(id) };
}

function extractIdFromResource(resource?: string): string | null {
    if (!resource) return null;
    const m = resource.match(/(\d+)$/);
    return m ? m[1]! : null;
}
