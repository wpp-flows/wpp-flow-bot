import { Route } from "@/infrastructure/http/decorators/route-decorator";
import { requireOrganization } from "@/infrastructure/http/middlewares/auth";
import type { FastifyReply, FastifyRequest } from "fastify";
import {
    makeGetOrder,
    makeListOrders,
    makeUpdateOrderStatus,
} from "../../usecases/factories";
import { listOrdersQuerySchema, updateOrderStatusSchema } from "../schema";

export class OrderController {
    @Route("GET", "/api/orders", { middlewares: [requireOrganization] })
    async list(request: FastifyRequest, reply: FastifyReply) {
        const query = listOrdersQuerySchema.parse(request.query ?? {});
        const result = await makeListOrders().execute({
            organizationId: request.organizationId,
            filters: {
                status: query.status,
                customerId: query.customerId,
                fromDate: query.fromDate ? new Date(query.fromDate) : undefined,
                toDate: query.toDate ? new Date(query.toDate) : undefined,
            },
        });
        return reply.send(result);
    }

    @Route("GET", "/api/orders/:id", { middlewares: [requireOrganization] })
    async getOne(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as { id: string };
        const result = await makeGetOrder().execute({
            organizationId: request.organizationId,
            id,
        });
        return reply.send(result);
    }

    @Route("PATCH", "/api/orders/:id/status", {
        middlewares: [requireOrganization],
    })
    async updateStatus(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as { id: string };
        const body = updateOrderStatusSchema.parse(request.body);
        const result = await makeUpdateOrderStatus().execute({
            organizationId: request.organizationId,
            id,
            status: body.status,
        });
        return reply.send(result);
    }
}
