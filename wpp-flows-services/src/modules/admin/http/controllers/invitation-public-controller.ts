import { Route } from "@/infrastructure/http/decorators/route-decorator";
import type { FastifyReply, FastifyRequest } from "fastify";
import {
    makeAcceptInvitation,
    makeValidateInvitationToken,
} from "../../usecases/factories";
import { acceptInvitationSchema } from "../schema";

export class InvitationPublicController {
    @Route("GET", "/api/invitations/:token")
    async validate(request: FastifyRequest, reply: FastifyReply) {
        const { token } = request.params as { token: string };
        const result = await makeValidateInvitationToken().execute(token);
        return reply.send(result);
    }

    @Route("POST", "/api/invitations/accept")
    async accept(request: FastifyRequest, reply: FastifyReply) {
        const body = acceptInvitationSchema.parse(request.body);
        const result = await makeAcceptInvitation().execute({
            token: body.token,
            name: body.name,
            password: body.password,
        });
        return reply.status(201).send(result);
    }
}
