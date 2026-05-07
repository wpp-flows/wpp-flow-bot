import { auth } from "@/infrastructure/auth/better-auth";
import { prisma } from "@/infrastructure/database/client";
import { AuthRequiredError } from "@/shared/exceptions/auth";
import { fromNodeHeaders } from "better-auth/node";
import type { FastifyReply, FastifyRequest } from "fastify";

declare module "fastify" {
    interface FastifyRequest {
        userId: string;
        organizationId: string;
    }
}

export async function requireAuth(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    const session = await auth.api.getSession({
        headers: fromNodeHeaders(request.headers),
    });

    if (!session?.user) {
        return reply.status(401).send({ error: new AuthRequiredError().message });
    }

    request.userId = session.user.id;
}

export async function requireOrganization(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    await requireAuth(request, reply);
    if (reply.sent) return;

    const organization = await prisma.organization.findUnique({
        where: { ownerId: request.userId },
        select: { id: true },
    });

    if (!organization) {
        return reply.status(403).send({
            error: "Organization not created. Set up your restaurant first."
        });
    }

    request.organizationId = organization.id;
}
