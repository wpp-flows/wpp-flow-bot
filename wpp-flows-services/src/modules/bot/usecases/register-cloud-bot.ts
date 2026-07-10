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

interface PhoneDetails {
    displayPhoneNumber?: string;
    verifiedName?: string;
}

/**
 * Provisions CLOUD_API bots. Two entrypoints share the same persistence:
 *
 *  - {@link execute}       — Embedded Signup: exchanges the auth code for the
 *    client's long-lived token, then connects the number. This is the flow
 *    restaurants use once the app is Live.
 *  - {@link executeManual} — connects a number from a token you already have
 *    (the test number's temporary token from App Dashboard → API Setup). Useful
 *    for local testing and for recording Meta's App Review demo video before
 *    Embedded Signup / Tech Provider access is approved.
 *
 * Re-running either for an existing phone_number_id re-authorizes it (fresh
 * token) rather than duplicating.
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
        this.assertCryptoReady();

        const token = await embeddedSignupClient.exchangeCode(input.code);

        // Subscribe / register are best-effort around the token: a WABA can
        // already be subscribed and a number can already be registered — we
        // still persist the credentials.
        await this.subscribeAndRegister(input.wabaId, input.phoneNumberId, token);
        const details = await this.getPhoneDetails(input.phoneNumberId, token);

        return this.persist({
            organizationId: input.organizationId,
            name: input.name,
            wabaId: input.wabaId,
            phoneNumberId: input.phoneNumberId,
            token,
            details,
        });
    }

    async executeManual(input: {
        organizationId: string;
        name?: string;
        phoneNumberId: string;
        accessToken: string;
        wabaId?: string;
    }): Promise<Bot> {
        if (!input.phoneNumberId || !input.accessToken) {
            throw new ValidationError(
                "Informe phoneNumberId e accessToken (Configuração da API no painel da Meta).",
            );
        }
        this.assertCryptoReady();

        // The WABA subscribe needs a waba id; skip it when the caller doesn't
        // have one (the test number is already reachable via the app's webhook).
        if (input.wabaId) {
            await this.subscribeAndRegister(
                input.wabaId,
                input.phoneNumberId,
                input.accessToken,
            );
        }
        const details = await this.getPhoneDetails(
            input.phoneNumberId,
            input.accessToken,
        );

        return this.persist({
            organizationId: input.organizationId,
            name: input.name,
            wabaId: input.wabaId,
            phoneNumberId: input.phoneNumberId,
            token: input.accessToken,
            details,
        });
    }

    private assertCryptoReady(): void {
        if (!isTokenCryptoConfigured()) {
            throw new ValidationError(
                "WHATSAPP_TOKEN_ENC_KEY não configurada no servidor — necessária para guardar o token com segurança.",
            );
        }
    }

    private async subscribeAndRegister(
        wabaId: string,
        phoneNumberId: string,
        token: string,
    ): Promise<void> {
        try {
            await embeddedSignupClient.subscribeApp(wabaId, token);
        } catch (err) {
            console.warn("RegisterCloudBot: subscribeApp failed (continuing):", err);
        }
        // Without /register the number can receive webhooks but not send.
        try {
            await embeddedSignupClient.registerPhone(
                phoneNumberId,
                token,
                env.META_PHONE_REGISTER_PIN,
            );
        } catch (err) {
            console.warn("RegisterCloudBot: registerPhone failed (continuing):", err);
        }
    }

    private async getPhoneDetails(
        phoneNumberId: string,
        token: string,
    ): Promise<PhoneDetails> {
        try {
            const details = await embeddedSignupClient.getPhoneNumber(
                phoneNumberId,
                token,
            );
            return {
                displayPhoneNumber: details.display_phone_number,
                verifiedName: details.verified_name,
            };
        } catch (err) {
            console.warn("RegisterCloudBot: getPhoneNumber failed (continuing):", err);
            return {};
        }
    }

    private async persist(input: {
        organizationId: string;
        name?: string;
        wabaId?: string;
        phoneNumberId: string;
        token: string;
        details: PhoneDetails;
    }): Promise<Bot> {
        const { displayPhoneNumber, verifiedName } = input.details;
        const encrypted = encryptToken(input.token);
        const name =
            input.name?.trim() || verifiedName || displayPhoneNumber || "WhatsApp";

        const existing = await this.repo.findByPhoneNumberId(input.phoneNumberId);
        if (existing) {
            return this.repo.update(existing.id, {
                provider: "CLOUD_API",
                wabaId: input.wabaId ?? existing.wabaId,
                accessToken: encrypted,
                displayPhoneNumber: displayPhoneNumber ?? existing.displayPhoneNumber,
                verifiedName: verifiedName ?? existing.verifiedName,
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
