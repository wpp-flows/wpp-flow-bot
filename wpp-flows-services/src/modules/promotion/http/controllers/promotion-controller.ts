import { Route } from "@/infrastructure/http/decorators/route-decorator";
import { requireOrganization } from "@/infrastructure/http/middlewares/auth";
import type { FastifyReply, FastifyRequest } from "fastify";
import {
    makeCreatePromotion,
    makeDeletePromotion,
    makeListPromotions,
    makeUpdatePromotion,
} from "../../usecases/factories";
import { createPromotionSchema, updatePromotionSchema } from "../schema";

export class PromotionController {
    @Route("GET", "/api/promotions", { middlewares: [requireOrganization] })
    async list(request: FastifyRequest, reply: FastifyReply) {
        const result = await makeListPromotions().execute(request.organizationId);
        return reply.send(result);
    }

    @Route("POST", "/api/promotions", { middlewares: [requireOrganization] })
    async create(request: FastifyRequest, reply: FastifyReply) {
        const body = createPromotionSchema.parse(request.body);
        const result = await makeCreatePromotion().execute({
            organizationId: request.organizationId,
            data: body,
        });
        return reply.status(201).send(result);
    }

    @Route("PATCH", "/api/promotions/:id", {
        middlewares: [requireOrganization],
    })
    async update(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as { id: string };
        const body = updatePromotionSchema.parse(request.body);
        const result = await makeUpdatePromotion().execute({
            organizationId: request.organizationId,
            id,
            data: body,
        });
        return reply.send(result);
    }

    @Route("DELETE", "/api/promotions/:id", {
        middlewares: [requireOrganization],
    })
    async remove(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as { id: string };
        await makeDeletePromotion().execute({
            organizationId: request.organizationId,
            id,
        });
        return reply.status(204).send();
    }
}
