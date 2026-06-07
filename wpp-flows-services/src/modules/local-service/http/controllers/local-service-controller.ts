import { Route } from "@/infrastructure/http/decorators/route-decorator";
import { requireOrganization } from "@/infrastructure/http/middlewares/auth";
import type { FastifyReply, FastifyRequest } from "fastify";
import {
    makeCloseBill,
    makeCreateTable,
    makeDeleteTable,
    makeGetBill,
    makeGetTable,
    makeListBills,
    makeListTables,
    makeRegenerateQrToken,
    makeUpdateTable,
} from "../../usecases/factories";
import {
    closeBillSchema,
    createTableSchema,
    updateTableSchema,
} from "../schema";

export class LocalServiceController {
    @Route("GET", "/api/local/tables", { middlewares: [requireOrganization] })
    async listTables(request: FastifyRequest, reply: FastifyReply) {
        const result = await makeListTables().execute(request.organizationId);
        return reply.send(result);
    }

    @Route("GET", "/api/local/tables/:id", {
        middlewares: [requireOrganization],
    })
    async getTable(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as { id: string };
        const result = await makeGetTable().execute({
            organizationId: request.organizationId,
            id,
        });
        return reply.send(result);
    }

    @Route("POST", "/api/local/tables", { middlewares: [requireOrganization] })
    async createTable(request: FastifyRequest, reply: FastifyReply) {
        const body = createTableSchema.parse(request.body);
        const result = await makeCreateTable().execute({
            organizationId: request.organizationId,
            label: body.label,
            seats: body.seats ?? null,
            notes: body.notes ?? null,
            position: body.position,
        });
        return reply.status(201).send(result);
    }

    @Route("PATCH", "/api/local/tables/:id", {
        middlewares: [requireOrganization],
    })
    async updateTable(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as { id: string };
        const body = updateTableSchema.parse(request.body);
        const result = await makeUpdateTable().execute({
            organizationId: request.organizationId,
            id,
            label: body.label,
            seats: body.seats,
            notes: body.notes,
            position: body.position,
        });
        return reply.send(result);
    }

    @Route("DELETE", "/api/local/tables/:id", {
        middlewares: [requireOrganization],
    })
    async deleteTable(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as { id: string };
        await makeDeleteTable().execute({
            organizationId: request.organizationId,
            id,
        });
        return reply.status(204).send();
    }

    @Route("POST", "/api/local/tables/:id/regenerate-qr", {
        middlewares: [requireOrganization],
    })
    async regenerateQr(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as { id: string };
        const result = await makeRegenerateQrToken().execute({
            organizationId: request.organizationId,
            id,
        });
        return reply.send(result);
    }

    @Route("POST", "/api/local/tables/:id/close-bill", {
        middlewares: [requireOrganization],
    })
    async closeBill(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as { id: string };
        const body = closeBillSchema.parse(request.body);
        const result = await makeCloseBill().execute({
            organizationId: request.organizationId,
            tableId: id,
            paymentMethod: body.paymentMethod,
            notes: body.notes ?? null,
            closedById: request.userId,
        });
        return reply.status(201).send(result);
    }

    @Route("GET", "/api/local/bills", { middlewares: [requireOrganization] })
    async listBills(request: FastifyRequest, reply: FastifyReply) {
        const result = await makeListBills().execute(request.organizationId);
        return reply.send(result);
    }

    @Route("GET", "/api/local/bills/:id", {
        middlewares: [requireOrganization],
    })
    async getBill(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as { id: string };
        const result = await makeGetBill().execute({
            organizationId: request.organizationId,
            id,
        });
        return reply.send(result);
    }
}
