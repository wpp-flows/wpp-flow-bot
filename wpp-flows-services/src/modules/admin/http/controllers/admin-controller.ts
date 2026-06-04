import { Route } from "@/infrastructure/http/decorators/route-decorator";
import { requireAdmin } from "@/infrastructure/http/middlewares/auth";
import { prisma } from "@/infrastructure/database/client";
import type { FastifyReply, FastifyRequest } from "fastify";
import {
    makeCreateInvitation,
    makeListInvitations,
    makeRevokeInvitation,
} from "../../usecases/factories";
import { createInvitationSchema } from "../schema";

export class AdminController {
    @Route("GET", "/api/admin/invitations", { middlewares: [requireAdmin] })
    async list(_request: FastifyRequest, reply: FastifyReply) {
        const result = await makeListInvitations().execute();
        return reply.send(result);
    }

    @Route("POST", "/api/admin/invitations", { middlewares: [requireAdmin] })
    async create(request: FastifyRequest, reply: FastifyReply) {
        const body = createInvitationSchema.parse(request.body);
        const inviter = await prisma.user.findUnique({
            where: { id: request.userId },
            select: { name: true },
        });
        const result = await makeCreateInvitation().execute({
            email: body.email,
            invitedById: request.userId,
            inviterName: inviter?.name ?? "Admin",
        });
        return reply.status(201).send(result);
    }

    @Route("POST", "/api/admin/invitations/:id/revoke", {
        middlewares: [requireAdmin],
    })
    async revoke(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as { id: string };
        const result = await makeRevokeInvitation().execute(id);
        return reply.send(result);
    }
}
