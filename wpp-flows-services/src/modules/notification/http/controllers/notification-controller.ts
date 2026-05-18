import { Route } from "@/infrastructure/http/decorators/route-decorator";
import { requireOrganization } from "@/infrastructure/http/middlewares/auth";
import type { FastifyReply, FastifyRequest } from "fastify";
import {
    makeCountUnreadNotifications,
    makeListNotifications,
    makeListRecentNotifications,
    makeMarkAllNotificationsRead,
    makeMarkNotificationRead,
} from "../../usecases/factories";
import { listNotificationsQuerySchema } from "../schema";

export class NotificationController {
    @Route("GET", "/api/notifications/recent", {
        middlewares: [requireOrganization],
    })
    async recent(request: FastifyRequest, reply: FastifyReply) {
        const [items, unread] = await Promise.all([
            makeListRecentNotifications().execute({
                organizationId: request.organizationId,
                limit: 5,
            }),
            makeCountUnreadNotifications().execute(request.organizationId),
        ]);
        return reply.send({ items, unread });
    }

    @Route("GET", "/api/notifications", { middlewares: [requireOrganization] })
    async list(request: FastifyRequest, reply: FastifyReply) {
        const query = listNotificationsQuerySchema.parse(request.query ?? {});
        const result = await makeListNotifications().execute({
            organizationId: request.organizationId,
            cursor: query.cursor,
            limit: query.limit,
        });
        return reply.send(result);
    }

    @Route("PATCH", "/api/notifications/:id/read", {
        middlewares: [requireOrganization],
    })
    async markRead(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as { id: string };
        const result = await makeMarkNotificationRead().execute({
            organizationId: request.organizationId,
            id,
        });
        return reply.send(result);
    }

    @Route("PATCH", "/api/notifications/read-all", {
        middlewares: [requireOrganization],
    })
    async markAllRead(request: FastifyRequest, reply: FastifyReply) {
        const result = await makeMarkAllNotificationsRead().execute(
            request.organizationId,
        );
        return reply.send(result);
    }
}
