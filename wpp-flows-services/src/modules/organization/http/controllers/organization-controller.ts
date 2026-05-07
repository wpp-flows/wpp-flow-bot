import { Route } from "@/infrastructure/http/decorators/route-decorator";
import { requireAuth, requireOrganization } from "@/infrastructure/http/middlewares/auth";
import type { FastifyReply, FastifyRequest } from "fastify";
import {
    makeCreateOrganization,
    makeGetOrganization,
    makeUpdateOrganization,
} from "../../usecases/factories";
import { createOrganizationSchema, updateOrganizationSchema } from "../schema";

export class OrganizationController {
    @Route("GET", "/api/organization", { middlewares: [requireAuth] })
    async getMine(request: FastifyRequest, reply: FastifyReply) {
        const useCase = makeGetOrganization();
        const org = await useCase.execute(request.userId);
        return reply.send(org);
    }

    @Route("POST", "/api/organization", { middlewares: [requireAuth] })
    async create(request: FastifyRequest, reply: FastifyReply) {
        const body = createOrganizationSchema.parse(request.body);
        const useCase = makeCreateOrganization();
        const org = await useCase.execute({ ownerId: request.userId, ...body });
        return reply.status(201).send(org);
    }

    @Route("PATCH", "/api/organization", { middlewares: [requireOrganization] })
    async update(request: FastifyRequest, reply: FastifyReply) {
        const body = updateOrganizationSchema.parse(request.body);
        const useCase = makeUpdateOrganization();
        const org = await useCase.execute({ ownerId: request.userId, ...body });
        return reply.send(org);
    }
}
