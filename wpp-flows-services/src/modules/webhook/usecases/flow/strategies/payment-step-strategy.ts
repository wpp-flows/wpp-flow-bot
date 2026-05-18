import { evolutionApi } from "@/infrastructure/evolution/client";
import type { FlowStep } from "@/modules/flow/repositories/flow-repo";
import type { OrderRepository } from "@/modules/order/repositories/order-repo";
import type { CreatePaymentLinkUseCase } from "@/modules/payment/usecases/mercadopago-usecases";
import { renderMessage } from "../../render-message";
import type { SendResult } from "../flow-shared";
import type {
    FlowStepSenderContext,
    FlowStepStrategy,
} from "./step-strategy";

/**
 * Renders PAYMENT steps as a Mercado Pago Checkout Pro link and parks the
 * conversation on this step until the MP webhook clears
 * `awaitingPaymentForOrderId`.
 *
 * Falls back to the step's static content when:
 *  - There's no order to charge (no `flowState.orderId`).
 *  - MP credentials aren't configured (the link generator throws).
 *  - The order is already PAID (we acknowledge and let the flow advance).
 */
export class PaymentStepStrategy implements FlowStepStrategy {
    constructor(
        private readonly orderRepo: OrderRepository,
        private readonly createPaymentLink: CreatePaymentLinkUseCase,
    ) {}

    supports(stepType: FlowStep["type"]): boolean {
        return stepType === "PAYMENT";
    }

    async send(input: FlowStepSenderContext): Promise<SendResult> {
        const { bot, phoneNumber, step, state, ctx } = input;
        const baseText = renderMessage(step.content, ctx);

        const sendPlain = async (text: string): Promise<SendResult> => {
            const resp = await evolutionApi.sendText({
                instanceName: bot.evolutionInstanceName,
                number: phoneNumber,
                text,
            });
            return { evolutionResp: resp, preview: text, optionMap: {} };
        };

        if (!state.orderId) return sendPlain(baseText);

        const existingOrder = await this.orderRepo.findByIdInOrg(
            bot.organizationId,
            state.orderId,
        );
        if (existingOrder?.paymentStatus === "PAID") {
            return sendPlain(`${baseText}\n\n✅ Pagamento confirmado. Obrigado!`);
        }

        let paymentLink = existingOrder?.paymentLink ?? null;
        if (!paymentLink) {
            try {
                const result = await this.createPaymentLink.execute({
                    organizationId: bot.organizationId,
                    orderId: state.orderId,
                });
                paymentLink = result.paymentLink;
            } catch (err) {
                console.error(
                    "Failed to create Mercado Pago payment link; falling back to plain text:",
                    err,
                );
                return sendPlain(baseText);
            }
        }

        const text = `${baseText}\n\nPague aqui: ${paymentLink}`;
        const resp = await evolutionApi.sendText({
            instanceName: bot.evolutionInstanceName,
            number: phoneNumber,
            text,
        });
        return {
            evolutionResp: resp,
            preview: text,
            optionMap: {},
            statePatch: { awaitingPaymentForOrderId: state.orderId },
        };
    }
}
