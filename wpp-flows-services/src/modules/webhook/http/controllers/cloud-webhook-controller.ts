import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/infrastructure/config/env";
import { Route } from "@/infrastructure/http/decorators/route-decorator";
import type { FastifyReply, FastifyRequest } from "fastify";
import { makeHandleCloudEvent } from "../../usecases/factories";
import type { CloudWebhookBody } from "../../usecases/cloud/handle-cloud-event";

/**
 * Single shared Meta Cloud API webhook for every restaurant. Meta fans all
 * events for all connected WABAs into this one endpoint; the handler routes by
 * phone_number_id. GET is Meta's verification handshake; POST is the event feed.
 */
export class CloudWebhookController {
    @Route("GET", "/api/webhooks/whatsapp")
    async verify(request: FastifyRequest, reply: FastifyReply) {
        const q = request.query as Record<string, string | undefined>;
        const mode = q["hub.mode"];
        const token = q["hub.verify_token"];
        const challenge = q["hub.challenge"];
        if (
            mode === "subscribe" &&
            env.META_WEBHOOK_VERIFY_TOKEN &&
            token === env.META_WEBHOOK_VERIFY_TOKEN
        ) {
            // Meta expects the raw challenge echoed back as text/plain.
            return reply.status(200).send(challenge);
        }
        return reply.status(403).send("Forbidden");
    }

    @Route("POST", "/api/webhooks/whatsapp")
    async receive(request: FastifyRequest, reply: FastifyReply) {
        if (!this.verifySignature(request)) {
            return reply.status(401).send({ error: "Invalid signature." });
        }
        // Always 200 fast — Meta retries on non-2xx and disables slow webhooks.
        // Processing is fire-and-forget; failures are logged, not surfaced.
        const body = (request.body ?? {}) as CloudWebhookBody;
        void makeHandleCloudEvent()
            .execute(body)
            .catch((err) => {
                console.error("HandleCloudEvent failed:", err);
            });
        return reply.status(200).send();
    }

    /**
     * Validates X-Hub-Signature-256 against META_APP_SECRET over the raw body.
     * When no app secret is configured (dev), we skip — but log — so local
     * testing without the full Meta setup still works.
     */
    private verifySignature(request: FastifyRequest): boolean {
        const secret = env.META_APP_SECRET;
        if (!secret) {
            console.warn(
                "Cloud webhook: META_APP_SECRET not set — skipping signature check.",
            );
            return true;
        }
        const header = request.headers["x-hub-signature-256"];
        const raw = (request as { rawBody?: string }).rawBody;
        if (typeof header !== "string" || !raw) return false;

        const expected =
            "sha256=" + createHmac("sha256", secret).update(raw).digest("hex");
        const a = Buffer.from(header);
        const b = Buffer.from(expected);
        return a.length === b.length && timingSafeEqual(a, b);
    }
}
