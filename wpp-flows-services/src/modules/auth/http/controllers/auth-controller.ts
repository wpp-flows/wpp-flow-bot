import { auth } from "@/infrastructure/auth/better-auth";
import { prisma } from "@/infrastructure/database/client";
import { Route } from "@/infrastructure/http/decorators/route-decorator";
import { fromNodeHeaders } from "better-auth/node";
import type { FastifyReply, FastifyRequest } from "fastify";

export class AuthController {
    @Route(["GET", "POST"], '/api/auth/*')
    async handler(request: FastifyRequest, reply: FastifyReply) {
        try {
            const url = new URL(request.url, `http://${request.headers.host}`);

            if (
                request.method === "POST" &&
                url.pathname.startsWith("/api/auth/sign-up")
            ) {
                return reply.status(403).send({
                    error: "Cadastro público desabilitado. Acesso somente por convite.",
                    code: "SIGN_UP_DISABLED",
                });
            }

            const headers = fromNodeHeaders(request.headers);

            const req = new Request(url.toString(), {
                method: request.method,
                headers,
                ...(request.body ? { body: JSON.stringify(request.body) } : {}),
            });

            const response = await auth.handler(req);
            reply.status(response.status);
            response.headers.forEach((value, key) => reply.header(key, value));
            return reply.send(response.body ? await response.text() : null);
        } catch (error) {
            // depois botar uns logs aqui
            console.log("Authentication error:", error);
            return reply.status(500).send({
                error: "Internal authentication error",
                code: "AUTH_FAILURE"
            });
        }
    }

    @Route(["GET"], '/api/me')
    async getSession(request: FastifyRequest, reply: FastifyReply) {
        const session = await auth.api.getSession({
            headers: fromNodeHeaders(request.headers),
        });
        if (!session) {
            return reply.status(401).send({ error: "Unauthorized" });
        }

        const meta = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { isAdmin: true },
        });
        return reply.send({
            ...session,
            user: { ...session.user, isAdmin: meta?.isAdmin ?? false },
        });
    }
}