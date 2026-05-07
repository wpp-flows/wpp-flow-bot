import { Route } from "@/infrastructure/http/decorators/route-decorator";
import { requireOrganization } from "@/infrastructure/http/middlewares/auth";
import type { FastifyReply, FastifyRequest } from "fastify";
import {
    makeConnectBot,
    makeCreateBot,
    makeDeleteBot,
    makeDisconnectBot,
    makeGetBot,
    makeGetBotConnectionState,
    makeListBots,
    makeUpdateBot,
} from "../../usecases/factories";
import { createBotSchema, updateBotSchema } from "../schema";

export class BotController {
    @Route("GET", "/api/bots", { middlewares: [requireOrganization] })
    async list(request: FastifyRequest, reply: FastifyReply) {
        const result = await makeListBots().execute(request.organizationId);
        return reply.send(result);
    }

    @Route("POST", "/api/bots", { middlewares: [requireOrganization] })
    async create(request: FastifyRequest, reply: FastifyReply) {
        const body = createBotSchema.parse(request.body);
        const result = await makeCreateBot().execute({
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

    @Route("POST", "/api/bots/:id/connect", { middlewares: [requireOrganization] })
    async connect(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as { id: string };
        const result = await makeConnectBot().execute({
            organizationId: request.organizationId,
            id,
        });
        return reply.send(result);
    }

    @Route("POST", "/api/bots/:id/disconnect", {
        middlewares: [requireOrganization],
    })
    async disconnect(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as { id: string };
        const result = await makeDisconnectBot().execute({
            organizationId: request.organizationId,
            id,
        });
        return reply.send(result);
    }

    @Route("GET", "/api/bots/:id/state", { middlewares: [requireOrganization] })
    async state(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as { id: string };
        const result = await makeGetBotConnectionState().execute({
            organizationId: request.organizationId,
            id,
        });
        return reply.send(result);
    }
}
