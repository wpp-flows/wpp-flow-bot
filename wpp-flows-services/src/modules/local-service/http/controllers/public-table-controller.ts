import { Route } from "@/infrastructure/http/decorators/route-decorator";
import { organizationRepo } from "@/modules/organization/usecases/factories";
import { orderRepo } from "@/modules/order/usecases/factories";
import { NotFoundError } from "@/shared/exceptions/http";
import type { FastifyReply, FastifyRequest } from "fastify";
import {
    makeRequestBill,
    tableRepo,
} from "../../usecases/factories";

export class PublicTableController {
    @Route("GET", "/api/public/tables/:token")
    async resolve(request: FastifyRequest, reply: FastifyReply) {
        const { token } = request.params as { token: string };
        const table = await tableRepo.findByToken(token);
        if (!table) throw new NotFoundError("Conecta");
        const org = await organizationRepo.findById(table.organizationId);
        if (!org) throw new NotFoundError("Restaurante");
        return reply.send({
            tableId: table.id,
            tableLabel: table.label,
            tableStatus: table.status,
            billRequested: !!table.billRequestedAt,
            slug: org.slug,
            organizationName: org.name,
        });
    }

    @Route("POST", "/api/public/tables/:token/request-bill")
    async requestBill(request: FastifyRequest, reply: FastifyReply) {
        const { token } = request.params as { token: string };
        const result = await makeRequestBill().execute(token);
        return reply.send({
            ok: true,
            billRequestedAt: result.billRequestedAt?.toISOString() ?? null,
        });
    }

    @Route("GET", "/api/public/tables/:token/orders")
    async listOrders(request: FastifyRequest, reply: FastifyReply) {
        const { token } = request.params as { token: string };
        const table = await tableRepo.findByToken(token);
        if (!table) throw new NotFoundError("Conecta");

        const orders = await orderRepo.listByOrg(table.organizationId, {
            serviceType: "LOCAL",
            tableId: table.id,
            unbilledOnly: true,
        });

        return reply.send({
            tableLabel: table.label,
            orders: orders.map((o) => ({
                id: o.id,
                sequence: o.sequence,
                status: o.status,
                customerName: o.customerName,
                items: o.items.map((it) => ({
                    name: it.name,
                    qty: it.qty,
                })),
                total: o.total,
                createdAt: o.createdAt.toISOString(),
            })),
        });
    }
}
