import { Route } from "@/infrastructure/http/decorators/route-decorator";
import { requireOrganization } from "@/infrastructure/http/middlewares/auth";
import type { FastifyReply, FastifyRequest } from "fastify";
import {
    makeGetOrder,
    makeListOrders,
    makeMarkOrderPaid,
    makeUpdateOrderStatus,
} from "../../usecases/factories";
import { listOrdersQuerySchema, updateOrderStatusSchema } from "../schema";

function resolveDateRange(
    date: string | undefined,
): { from: Date; to: Date } | null {
    if (!date) return null;
    let year: number;
    let month: number;
    let day: number;
    if (date === "today") {
        const parts = new Intl.DateTimeFormat("en-CA", {
            timeZone: "America/Sao_Paulo",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        }).formatToParts(new Date());
        const get = (type: string) =>
            Number(parts.find((p) => p.type === type)?.value ?? "0");
        year = get("year");
        month = get("month") - 1;
        day = get("day");
    } else {
        const [y, m, d] = date.split("-").map(Number);
        if (!y || !m || !d) return null;
        year = y;
        month = m - 1;
        day = d;
    }
    const from = new Date(Date.UTC(year, month, day, 3, 0, 0));
    const to = new Date(Date.UTC(year, month, day + 1, 3, 0, 0));
    return { from, to };
}

export class OrderController {
    @Route("GET", "/api/orders", { middlewares: [requireOrganization] })
    async list(request: FastifyRequest, reply: FastifyReply) {
        const query = listOrdersQuerySchema.parse(request.query ?? {});
        const dateRange = resolveDateRange(query.date);
        const result = await makeListOrders().execute({
            organizationId: request.organizationId,
            filters: {
                status: query.status,
                customerId: query.customerId,
                serviceType: query.serviceType,
                tableId: query.tableId,
                unbilledOnly: query.unbilledOnly === "true",
                fromDate:
                    dateRange?.from ??
                    (query.fromDate ? new Date(query.fromDate) : undefined),
                toDate:
                    dateRange?.to ??
                    (query.toDate ? new Date(query.toDate) : undefined),
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
            notifyCustomer: body.notifyCustomer,
        });
        return reply.send(result);
    }

    @Route("PATCH", "/api/orders/:id/mark-paid", {
        middlewares: [requireOrganization],
    })
    async markPaid(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as { id: string };
        const result = await makeMarkOrderPaid().execute({
            organizationId: request.organizationId,
            id,
        });
        return reply.send(result);
    }
}
