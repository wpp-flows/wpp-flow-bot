import { Route } from "@/infrastructure/http/decorators/route-decorator";
import { orderRepo } from "@/modules/order/usecases/factories";
import { notifyPaymentConfirmed } from "@/modules/public-orders/usecases/factories";
import type { FastifyReply, FastifyRequest } from "fastify";
import { handleMercadoPagoWebhook } from "../../usecases/factories";

/**
 * Public endpoint Mercado Pago hits when a payment changes state. The handler
 * marks the order paid, credits the org wallet, and emits the dashboard
 * notification. On approved payments we also fire the customer-facing
 * "payment confirmed" WhatsApp message so the customer hears from us even if
 * they don't come back to WhatsApp via the success-page deep-link.
 *
 * Failures are logged but always return 200 so MP doesn't retry forever.
 */
export class MercadoPagoWebhookController {
    @Route("POST", "/webhook/mercadopago/:organizationId")
    async receive(request: FastifyRequest, reply: FastifyReply) {
        const { organizationId } = request.params as { organizationId: string };
        const headerOf = (name: string): string | undefined => {
            const raw = request.headers[name];
            return Array.isArray(raw) ? raw[0] : (raw);
        };
        try {
            const result = await handleMercadoPagoWebhook.execute({
                organizationId,
                body: request.body,
                headers: {
                    signature: headerOf("x-signature"),
                    requestId: headerOf("x-request-id"),
                },
            });

            if (result.paid && result.orderId) {
                const order = await orderRepo.findByIdInOrg(
                    organizationId,
                    result.orderId,
                );
                if (order) {
                    void notifyPaymentConfirmed.execute(order);
                }
            }
        } catch (err) {
            console.error("Mercado Pago webhook handler failed:", err);
        }
        return reply.status(200).send({ ok: true });
    }
}
