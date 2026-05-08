import { Route } from "@/infrastructure/http/decorators/route-decorator";
import { requireOrganization } from "@/infrastructure/http/middlewares/auth";
import type { FastifyReply, FastifyRequest } from "fastify";
import {
    makeGetConversation,
    makeListConversations,
    makeListMessages,
    makeMarkConversationRead,
    makeSendMessage,
    makeSetBotActive,
    makeUpdateConversationStatus,
} from "../../usecases/factories";
import {
    conversationFiltersSchema,
    sendMessageSchema,
    setBotActiveSchema,
    updateStatusSchema,
} from "../schema";

export class ChatController {
    @Route("GET", "/api/chats", { middlewares: [requireOrganization] })
    async list(request: FastifyRequest, reply: FastifyReply) {
        const query = conversationFiltersSchema.parse(request.query);
        const result = await makeListConversations().execute({
            organizationId: request.organizationId,
            filters: {
                search: query.search,
                status: query.status,
                botId: query.botId,
                fromDate: query.fromDate ? new Date(query.fromDate) : undefined,
                toDate: query.toDate ? new Date(query.toDate) : undefined,
            },
        });
        return reply.send(result);
    }

    @Route("GET", "/api/chats/:id", { middlewares: [requireOrganization] })
    async getOne(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as { id: string };
        const result = await makeGetConversation().execute({
            organizationId: request.organizationId,
            id,
        });
        return reply.send(result);
    }

    @Route("GET", "/api/chats/:id/messages", {
        middlewares: [requireOrganization],
    })
    async listMessages(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as { id: string };
        const { limit } = request.query as { limit?: string };
        const result = await makeListMessages().execute({
            organizationId: request.organizationId,
            conversationId: id,
            limit: limit ? Number(limit) : undefined,
        });
        return reply.send(result);
    }

    @Route("POST", "/api/chats/:id/messages", {
        middlewares: [requireOrganization],
    })
    async sendMessage(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as { id: string };
        const body = sendMessageSchema.parse(request.body);
        const result = await makeSendMessage().execute({
            organizationId: request.organizationId,
            conversationId: id,
            content: body.content,
            author: "AGENT",
        });
        return reply.status(201).send(result);
    }

    @Route("PATCH", "/api/chats/:id/bot-active", {
        middlewares: [requireOrganization],
    })
    async setBotActive(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as { id: string };
        const body = setBotActiveSchema.parse(request.body);
        const result = await makeSetBotActive().execute({
            organizationId: request.organizationId,
            conversationId: id,
            botActive: body.botActive,
        });
        return reply.send(result);
    }

    @Route("PATCH", "/api/chats/:id/status", {
        middlewares: [requireOrganization],
    })
    async setStatus(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as { id: string };
        const body = updateStatusSchema.parse(request.body);
        const result = await makeUpdateConversationStatus().execute({
            organizationId: request.organizationId,
            conversationId: id,
            status: body.status,
        });
        return reply.send(result);
    }

    @Route("PATCH", "/api/chats/:id/read", {
        middlewares: [requireOrganization],
    })
    async markRead(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as { id: string };
        const result = await makeMarkConversationRead().execute({
            organizationId: request.organizationId,
            conversationId: id,
        });
        return reply.send(result);
    }
}
