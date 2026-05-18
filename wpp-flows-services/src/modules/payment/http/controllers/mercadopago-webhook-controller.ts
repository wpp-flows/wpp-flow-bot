import { Route } from "@/infrastructure/http/decorators/route-decorator";
import { conversationRepo } from "@/modules/chat/usecases/factories";
import { botRepo } from "@/modules/bot/usecases/factories";
import { flowRunner } from "@/modules/webhook/usecases/factories";
import type { FastifyReply, FastifyRequest } from "fastify";
import { handleMercadoPagoWebhook } from "../../usecases/factories";

/**
 * Public endpoint Mercado Pago hits when a payment changes state. We accept
 * the call, look up the order, mark it paid, credit the wallet, and resume the
 * flow. Failures are logged but always return 200 so MP doesn't retry forever.
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
            // If payment cleared, advance the parked conversation.
            if (result.paid && result.orderId) {
                await resumeConversationForOrder(result.orderId);
            }
        } catch (err) {
            console.error("Mercado Pago webhook handler failed:", err);
        }
        return reply.status(200).send({ ok: true });
    }
}

async function resumeConversationForOrder(orderId: string): Promise<void> {
    const { prisma } = await import("@/infrastructure/database/client");
    const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: { conversationId: true },
    });
    if (!order?.conversationId) return;
    const conversation = await prisma.conversation.findUnique({
        where: { id: order.conversationId },
        select: { id: true, botId: true, organizationId: true },
    });
    if (!conversation) return;
    const bot = await botRepo.findByIdInOrg(
        conversation.organizationId,
        conversation.botId,
    );
    if (!bot) return;
    const full = await conversationRepo.findByIdInOrg(
        conversation.organizationId,
        conversation.id,
    );
    if (!full) return;
    await flowRunner.resumeAfterPayment({ bot, conversation: full });
}
