import { env } from "@/infrastructure/config/env";
import { Route } from "@/infrastructure/http/decorators/route-decorator";
import { requireOrganization } from "@/infrastructure/http/middlewares/auth";
import type { FastifyReply, FastifyRequest } from "fastify";
import {
    makeDeleteBot,
    makeGetBot,
    makeListBots,
    makeRegisterCloudBot,
    makeSetBotIsActive,
    makeUpdateBot,
} from "../../usecases/factories";
import {
    cloudManualSchema,
    embeddedSignupSchema,
    setBotIsActiveSchema,
    updateBotSchema,
} from "../schema";

export class BotController {
    @Route("GET", "/api/bots", { middlewares: [requireOrganization] })
    async list(request: FastifyRequest, reply: FastifyReply) {
        const result = await makeListBots().execute(request.organizationId);
        return reply.send(result);
    }

    /** Public config the frontend needs to launch the Embedded Signup popup. */
    @Route("GET", "/api/bots/embedded-signup/config", {
        middlewares: [requireOrganization],
    })
    async embeddedSignupConfig(_request: FastifyRequest, reply: FastifyReply) {
        return reply.send({
            appId: env.META_APP_ID ?? null,
            configId: env.META_EMBEDDED_SIGNUP_CONFIG_ID ?? null,
            graphVersion: env.META_GRAPH_VERSION,
            configured: Boolean(
                env.META_APP_ID && env.META_EMBEDDED_SIGNUP_CONFIG_ID,
            ),
        });
    }

    /** Completes Embedded Signup and provisions a CLOUD_API bot. */
    @Route("POST", "/api/bots/embedded-signup", {
        middlewares: [requireOrganization],
    })
    async embeddedSignup(request: FastifyRequest, reply: FastifyReply) {
        const body = embeddedSignupSchema.parse(request.body);
        const result = await makeRegisterCloudBot().execute({
            organizationId: request.organizationId,
            ...body,
        });
        return reply.status(201).send(result);
    }

    /**
     * Connects a CLOUD_API bot from a token supplied directly (Meta test number
     * / System User token). Bridges the pre-App-Review gap for testing and the
     * demo video.
     */
    @Route("POST", "/api/bots/cloud/manual", {
        middlewares: [requireOrganization],
    })
    async cloudManual(request: FastifyRequest, reply: FastifyReply) {
        const body = cloudManualSchema.parse(request.body);
        const result = await makeRegisterCloudBot().executeManual({
            organizationId: request.organizationId,
            ...body,
        });
        return reply.status(201).send(result);
    }

    @Route("GET", "/api/bots/:id", { middlewares: [requireOrganization] })
    async getOne(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as { id: string };
        const result = await makeGetBot().execute({
            organizationId: request.organizationId,
            id,
        });
        return reply.send(result);
    }

    @Route("PATCH", "/api/bots/:id", { middlewares: [requireOrganization] })
    async update(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as { id: string };
        const body = updateBotSchema.parse(request.body);
        const result = await makeUpdateBot().execute({
            organizationId: request.organizationId,
            id,
            ...body,
        });
        return reply.send(result);
    }

    @Route("DELETE", "/api/bots/:id", { middlewares: [requireOrganization] })
    async remove(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as { id: string };
        await makeDeleteBot().execute({
            organizationId: request.organizationId,
            id,
        });
        return reply.status(204).send();
    }

    @Route("PATCH", "/api/bots/:id/is-active", {
        middlewares: [requireOrganization],
    })
    async setIsActive(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as { id: string };
        const body = setBotIsActiveSchema.parse(request.body);
        const result = await makeSetBotIsActive().execute({
            organizationId: request.organizationId,
            id,
            isActive: body.isActive,
        });
        return reply.send(result);
    }
}
