import { evolutionApi } from "@/infrastructure/evolution/client";
import type { FlowStep } from "@/modules/flow/repositories/flow-repo";
import { renderMessage } from "../../render-message";
import type { ButtonOption } from "../flow-list-types";
import { buildButtonsOptionMap, renderButtonsAsText } from "../flow-option-map";
import { ADD_MORE_ID, BACK_ID, CONFIRM_ID, type SendResult } from "../flow-shared";
import type {
    FlowStepSenderContext,
    FlowStepStrategy,
} from "./step-strategy";

/**
 * Renders CONFIRMATION steps as plain numbered text with a cart summary plus
 * the three options: Confirmar / Adicionar mais / Voltar. The option map
 * routes the customer's typed reply ("1", "confirmar", etc.) back to the
 * appropriate selection id.
 */
export class ConfirmationStepStrategy implements FlowStepStrategy {
    supports(stepType: FlowStep["type"]): boolean {
        return stepType === "CONFIRMATION";
    }

    async send(input: FlowStepSenderContext): Promise<SendResult> {
        const { bot, phoneNumber, step, state, ctx } = input;
        const cartLines = state.cart.length
            ? state.cart
                .map((entry) => `• ${entry.qty}x ${entry.name} (R$ ${entry.price})`)
                .join("\n")
            : "Seu carrinho está vazio.";
        const prompt = `${renderMessage(step.content, ctx)}\n\n${cartLines}`;
        const buttons: ButtonOption[] = [
            { buttonId: CONFIRM_ID, buttonText: { displayText: "✅ Confirmar" } },
            { buttonId: ADD_MORE_ID, buttonText: { displayText: "➕ Adicionar mais" } },
            { buttonId: BACK_ID, buttonText: { displayText: "⬅️ Voltar" } },
        ];
        const optionMap = buildButtonsOptionMap(buttons);

        const text = `${prompt}\n\n${renderButtonsAsText(buttons)}`;
        const evolutionResp = await evolutionApi.sendText({
            instanceName: bot.evolutionInstanceName,
            number: phoneNumber,
            text,
        });
        return { evolutionResp, preview: prompt, optionMap };
    }
}
