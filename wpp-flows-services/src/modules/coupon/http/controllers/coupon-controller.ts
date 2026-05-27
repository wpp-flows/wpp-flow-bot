import { Route } from "@/infrastructure/http/decorators/route-decorator";
import { requireOrganization } from "@/infrastructure/http/middlewares/auth";
import type { FastifyReply, FastifyRequest } from "fastify";
import {
    makeCreateCoupon,
    makeDeleteCoupon,
    makeListCoupons,
    makeUpdateCoupon,
} from "../../usecases/factories";
import { createCouponSchema, updateCouponSchema } from "../schema";

export class CouponController {
    @Route("GET", "/api/coupons", { middlewares: [requireOrganization] })
    async list(request: FastifyRequest, reply: FastifyReply) {
        const result = await makeListCoupons().execute(request.organizationId);
        return reply.send(result);
    }

    @Route("POST", "/api/coupons", { middlewares: [requireOrganization] })
    async create(request: FastifyRequest, reply: FastifyReply) {
        const body = createCouponSchema.parse(request.body);
        const result = await makeCreateCoupon().execute({
            organizationId: request.organizationId,
            data: body,
        });
        return reply.status(201).send(result);
    }

    @Route("PATCH", "/api/coupons/:id", { middlewares: [requireOrganization] })
    async update(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as { id: string };
        const body = updateCouponSchema.parse(request.body);
        const result = await makeUpdateCoupon().execute({
            organizationId: request.organizationId,
            id,
            data: body,
        });
        return reply.send(result);
    }

    @Route("DELETE", "/api/coupons/:id", { middlewares: [requireOrganization] })
    async remove(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as { id: string };
        await makeDeleteCoupon().execute({
            organizationId: request.organizationId,
            id,
        });
        return reply.status(204).send();
    }
}
