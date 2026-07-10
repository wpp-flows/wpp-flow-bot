import { senderFor } from "@/infrastructure/whatsapp";
import { NotFoundError } from "@/shared/exceptions/http";
import type { BotRepository } from "../repositories/bot-repo";

const DEFAULT_TEXT = "✅ Mensagem de teste enviada pelo painel.";

/**
 * Sends a one-off text through a connected bot — the "Enviar teste" button on
 * the Bots page. Handy for validating a fresh connection and for recording
 * Meta's App Review demo video (your app clearly sending, phone receiving).
 *
 * Note: on the Meta test number the recipient must be one of the pre-verified
 * "Para" numbers from API Setup, otherwise Graph rejects the send.
 */
export class SendTestMessageUseCase {
    constructor(private readonly repo: BotRepository) { }

    async execute(input: {
        organizationId: string;
        id: string;
        to: string;
        text?: string;
    }): Promise<{ messageId: string }> {
        const bot = await this.repo.findByIdInOrg(input.organizationId, input.id);
        if (!bot) throw new NotFoundError("Bot");

        const { gateway, transport } = senderFor(bot);
        const res = await gateway.sendText(
            transport,
            input.to,
            input.text?.trim() || DEFAULT_TEXT,
        );
        return { messageId: res.messageId };
    }
}
