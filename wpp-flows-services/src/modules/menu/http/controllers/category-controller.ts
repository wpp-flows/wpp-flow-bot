import { Route } from "@/infrastructure/http/decorators/route-decorator";
import { requireOrganization } from "@/infrastructure/http/middlewares/auth";
import type { FastifyReply, FastifyRequest } from "fastify";
import {
    makeCreateCategory,
    makeDeleteCategory,
    makeListCategories,
    makeReorderCategories,
    makeUpdateCategory,
} from "../../usecases/factories";
import {
    createCategorySchema,
    reorderCategoriesSchema,
    updateCategorySchema,
} from "../schema";

export class CategoryController {
    @Route("GET", "/api/menu/categories", { middlewares: [requireOrganization] })
    async list(request: FastifyRequest, reply: FastifyReply) {
        const useCase = makeListCategories();
        const result = await useCase.execute(request.organizationId);
        return reply.send(result);
    }

    @Route("POST", "/api/menu/categories", { middlewares: [requireOrganization] })
    async create(request: FastifyRequest, reply: FastifyReply) {
        const body = createCategorySchema.parse(request.body);
        const useCase = makeCreateCategory();
        const created = await useCase.execute({
            organizationId: request.organizationId,
            ...body,
        });
        return reply.status(201).send(created);
    }

    @Route("PATCH", "/api/menu/categories/reorder", {
        middlewares: [requireOrganization],
    })
    async reorder(request: FastifyRequest, reply: FastifyReply) {
        const body = reorderCategoriesSchema.parse(request.body);
        const useCase = makeReorderCategories();
        const list = await useCase.execute({
            organizationId: request.organizationId,
            orderedIds: body.orderedIds,
        });
        return reply.send(list);
    }

    @Route("PATCH", "/api/menu/categories/:id", {
        middlewares: [requireOrganization],
    })
    async update(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as { id: string };
        const body = updateCategorySchema.parse(request.body);
        const useCase = makeUpdateCategory();
        const result = await useCase.execute({
            organizationId: request.organizationId,
            id,
            ...body,
        });
        return reply.send(result);
    }

    @Route("DELETE", "/api/menu/categories/:id", {
        middlewares: [requireOrganization],
    })
    async remove(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as { id: string };
        const useCase = makeDeleteCategory();
        await useCase.execute({ organizationId: request.organizationId, id });
        return reply.status(204).send();
    }
}
