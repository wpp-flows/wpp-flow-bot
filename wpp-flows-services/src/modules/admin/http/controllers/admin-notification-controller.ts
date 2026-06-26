import { Route } from "@/infrastructure/http/decorators/route-decorator";
import { requireAdmin } from "@/infrastructure/http/middlewares/auth";
import type { FastifyReply, FastifyRequest } from "fastify";
import {
    makeListAdminNotifications,
    makeMarkAdminNotificationRead,
    makeMarkAllAdminNotificationsRead,
} from "../../usecases/factories";

export class AdminNotificationController {
    @Route("GET", "/api/admin/notifications", { middlewares: [requireAdmin] })
    async list(_request: FastifyRequest, reply: FastifyReply) {
        const result = await makeListAdminNotifications().execute();
        return reply.send(result);
    }

    @Route("POST", "/api/admin/notifications/:id/read", {
        middlewares: [requireAdmin],
    })
    async markRead(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as { id: string };
        const result = await makeMarkAdminNotificationRead().execute(id);
        return reply.send(result);
    }

    @Route("POST", "/api/admin/notifications/read-all", {
        middlewares: [requireAdmin],
    })
    async markAllRead(_request: FastifyRequest, reply: FastifyReply) {
        const result = await makeMarkAllAdminNotificationsRead().execute();
        return reply.send(result);
    }
}
