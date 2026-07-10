import { env } from "@/infrastructure/config/env";
import {
    embeddedSignupClient,
    isEmbeddedSignupConfigured,
} from "@/infrastructure/whatsapp/embedded-signup-client";
import {
    encryptToken,
    isTokenCryptoConfigured,
} from "@/infrastructure/whatsapp/token-crypto";
import { ValidationError } from "@/shared/exceptions/http";
import type { Bot, BotRepository } from "../repositories/bot-repo";

/**
 * Completes Embedded Signup: exchanges the authorization code for the client's
 * long-lived token, subscribes our app to their WABA (so their webhooks reach
 * our shared endpoint), registers the phone for Cloud messaging, reads the
 * number's display details, and persists a CLOUD_API bot. Re-running for a
 * phone_number_id that already exists re-authorizes it (fresh token) rather
 * than duplicating.
 */
export class RegisterCloudBotUseCase {
    constructor(private readonly repo: BotRepository) { }

    async execute(input: {
        organizationId: string;
        name?: string;
        code: string;
        wabaId: string;
        phoneNumberId: string;
    }): Promise<Bot> {
        if (!input.code || !input.wabaId || !input.phoneNumberId) {
            throw new ValidationError(
                "Dados do Embedded Signup incompletos (code, wabaId, phoneNumberId).",
            );
        }
        // Fail with actionable messages instead of a generic 500 from deep
        // inside the token exchange / encryption.
        if (!isEmbeddedSignupConfigured()) {
            throw new ValidationError(
                "Integração Meta não configurada no servidor (META_APP_ID / META_APP_SECRET).",
            );
        }
        if (!isTokenCryptoConfigured()) {
            throw new ValidationError(
                "WHATSAPP_TOKEN_ENC_KEY não configurada no servidor — necessária para guardar o token com segurança.",
            );
        }

        const token = await embeddedSignupClient.exchangeCode(input.code);

        // Subscribe / register / phone lookup are best-effort around the token:
        // a WABA can already be subscribed, a number can already be registered,
        // and a missing phone read shouldn't block the connection — we still
        // persist the credentials.
        try {
            await embeddedSignupClient.subscribeApp(input.wabaId, token);
        } catch (err) {
            console.warn("RegisterCloudBot: subscribeApp failed (continuing):", err);
        }

        // Without /register the number can receive webhooks but not send.
        // Already-registered numbers return an error we tolerate.
        try {
            await embeddedSignupClient.registerPhone(
                input.phoneNumberId,
                token,
                env.META_PHONE_REGISTER_PIN,
            );
        } catch (err) {
            console.warn("RegisterCloudBot: registerPhone failed (continuing):", err);
        }

        let displayPhoneNumber: string | undefined;
        let verifiedName: string | undefined;
        try {
            const details = await embeddedSignupClient.getPhoneNumber(
                input.phoneNumberId,
                token,
            );
            displayPhoneNumber = details.display_phone_number;
            verifiedName = details.verified_name;
        } catch (err) {
            console.warn("RegisterCloudBot: getPhoneNumber failed (continuing):", err);
        }

        const encrypted = encryptToken(token);
        const name = input.name?.trim() || verifiedName || displayPhoneNumber || "WhatsApp";

        const existing = await this.repo.findByPhoneNumberId(input.phoneNumberId);
        if (existing) {
            return this.repo.update(existing.id, {
                provider: "CLOUD_API",
                wabaId: input.wabaId,
                accessToken: encrypted,
                displayPhoneNumber: displayPhoneNumber ?? null,
                verifiedName: verifiedName ?? null,
                phoneNumber: displayPhoneNumber ?? existing.phoneNumber,
                tokenStatus: "ACTIVE",
                status: "ONLINE",
                qrCode: null,
            });
        }

        return this.repo.create({
            organizationId: input.organizationId,
            name,
            provider: "CLOUD_API",
            wabaId: input.wabaId,
            phoneNumberId: input.phoneNumberId,
            accessToken: encrypted,
            displayPhoneNumber,
            verifiedName,
            phoneNumber: displayPhoneNumber,
            tokenStatus: "ACTIVE",
            status: "ONLINE",
        });
    }
}
