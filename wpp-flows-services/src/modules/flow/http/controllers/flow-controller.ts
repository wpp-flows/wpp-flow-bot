import { Route } from "@/infrastructure/http/decorators/route-decorator";
import { requireOrganization } from "@/infrastructure/http/middlewares/auth";
import type { FastifyReply, FastifyRequest } from "fastify";
import {
    makeActivateFlow,
    makeCreateFlow,
    makeCreateNewFlowVersion,
    makeDeleteFlow,
    makeGetActiveFlow,
    makeGetFlow,
    makeListFlows,
    makeReorderFlowSteps,
    makeReplaceFlowSteps,
    makeUpdateFlow,
} from "../../usecases/factories";
import {
    createFlowSchema,
    newFlowVersionSchema,
    reorderStepsSchema,
    replaceStepsSchema,
    updateFlowSchema,
} from "../schema";

export class FlowController {
    @Route("GET", "/api/flows", { middlewares: [requireOrganization] })
    async list(request: FastifyRequest, reply: FastifyReply) {
        const result = await makeListFlows().execute(request.organizationId);
        return reply.send(result);
    }

    @Route("GET", "/api/flows/active", { middlewares: [requireOrganization] })
    async getActive(request: FastifyRequest, reply: FastifyReply) {
        const result = await makeGetActiveFlow().execute(request.organizationId);
        return reply.send(result);
    }

    @Route("POST", "/api/flows", { middlewares: [requireOrganization] })
    async create(request: FastifyRequest, reply: FastifyReply) {
        const body = createFlowSchema.parse(request.body);
        const result = await makeCreateFlow().execute({
            organizationId: request.organizationId,
            ...body,
        });
        return reply.status(201).send(result);
    }

    @Route("GET", "/api/flows/:id", { middlewares: [requireOrganization] })
    async getOne(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as { id: string };
        const result = await makeGetFlow().execute({
            organizationId: request.organizationId,
            id,
        });
        return reply.send(result);
    }

    @Route("PATCH", "/api/flows/:id", { middlewares: [requireOrganization] })
    async update(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as { id: string };
        const body = updateFlowSchema.parse(request.body);
        const result = await makeUpdateFlow().execute({
            organizationId: request.organizationId,
            id,
            ...body,
        });
        return reply.send(result);
    }

    @Route("DELETE", "/api/flows/:id", { middlewares: [requireOrganization] })
    async remove(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as { id: string };
        await makeDeleteFlow().execute({
            organizationId: request.organizationId,
            id,
        });
        return reply.status(204).send();
    }

    @Route("POST", "/api/flows/:id/new-version", {
        middlewares: [requireOrganization],
    })
    async newVersion(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as { id: string };
        const body = newFlowVersionSchema.parse(request.body ?? {});
        const result = await makeCreateNewFlowVersion().execute({
            organizationId: request.organizationId,
            id,
            ...body,
        });
        return reply.status(201).send(result);
    }

    @Route("PATCH", "/api/flows/:id/activate", {
        middlewares: [requireOrganization],
    })
    async activate(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as { id: string };
        const result = await makeActivateFlow().execute({
            organizationId: request.organizationId,
            id,
        });
        return reply.send(result);
    }

    @Route("PUT", "/api/flows/:id/steps", { middlewares: [requireOrganization] })
    async replaceSteps(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as { id: string };
        const body = replaceStepsSchema.parse(request.body);
        const result = await makeReplaceFlowSteps().execute({
            organizationId: request.organizationId,
            id,
            steps: body.steps,
        });
        return reply.send(result);
    }

    @Route("PATCH", "/api/flows/:id/steps/reorder", {
        middlewares: [requireOrganization],
    })
    async reorderSteps(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as { id: string };
        const body = reorderStepsSchema.parse(request.body);
        const result = await makeReorderFlowSteps().execute({
            organizationId: request.organizationId,
            id,
            orderedIds: body.orderedIds,
        });
        return reply.send(result);
    }
}
