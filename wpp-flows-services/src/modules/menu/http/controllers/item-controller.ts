import { Route } from "@/infrastructure/http/decorators/route-decorator";
import { requireOrganization } from "@/infrastructure/http/middlewares/auth";
import type { FastifyReply, FastifyRequest } from "fastify";
import {
    makeCreateItem,
    makeDeleteItem,
    makeListItems,
    makeReorderItems,
    makeUpdateItem,
} from "../../usecases/factories";
import {
    createItemSchema,
    listMenuQuerySchema,
    reorderItemsSchema,
    updateItemSchema,
} from "../schema";

export class ItemController {
    @Route("GET", "/api/menu/items", { middlewares: [requireOrganization] })
    async list(request: FastifyRequest, reply: FastifyReply) {
        const query = listMenuQuerySchema.parse(request.query ?? {});
        const useCase = makeListItems();
        const result = await useCase.execute(request.organizationId, {
            serviceType: query.serviceType,
        });
        return reply.send(result);
    }

    @Route("POST", "/api/menu/items", { middlewares: [requireOrganization] })
    async create(request: FastifyRequest, reply: FastifyReply) {
        const body = createItemSchema.parse(request.body);
        const useCase = makeCreateItem();
        const created = await useCase.execute({
            organizationId: request.organizationId,
            ...body,
        });
        return reply.status(201).send(created);
    }

    @Route("PATCH", "/api/menu/items/reorder", {
        middlewares: [requireOrganization],
    })
    async reorder(request: FastifyRequest, reply: FastifyReply) {
        const body = reorderItemsSchema.parse(request.body);
        const useCase = makeReorderItems();
        const list = await useCase.execute({
            organizationId: request.organizationId,
            categoryId: body.categoryId,
            orderedIds: body.orderedIds,
        });
        return reply.send(list);
    }

    @Route("PATCH", "/api/menu/items/:id", {
        middlewares: [requireOrganization],
    })
    async update(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as { id: string };
        const body = updateItemSchema.parse(request.body);
        const useCase = makeUpdateItem();
        const result = await useCase.execute({
            organizationId: request.organizationId,
            id,
            ...body,
        });
        return reply.send(result);
    }

    @Route("DELETE", "/api/menu/items/:id", {
        middlewares: [requireOrganization],
    })
    async remove(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as { id: string };
        const useCase = makeDeleteItem();
        await useCase.execute({ organizationId: request.organizationId, id });
        return reply.status(204).send();
    }
}
