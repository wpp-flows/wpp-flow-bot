import { Route } from "@/infrastructure/http/decorators/route-decorator";
import { requireOrganization } from "@/infrastructure/http/middlewares/auth";
import type { FastifyReply, FastifyRequest } from "fastify";
import {
    makeCreateFlowStep,
    makeDeleteFlowStep,
    makeUpdateFlowStep,
} from "../../usecases/factories";
import { createFlowStepSchema, updateFlowStepSchema } from "../schema";

export class FlowStepController {
    @Route("POST", "/api/flows/:flowId/steps", {
        middlewares: [requireOrganization],
    })
    async create(request: FastifyRequest, reply: FastifyReply) {
        const { flowId } = request.params as { flowId: string };
        const body = createFlowStepSchema.parse(request.body);
        const result = await makeCreateFlowStep().execute({
            organizationId: request.organizationId,
            flowId,
            step: body,
        });
        return reply.status(201).send(result);
    }

    @Route("PATCH", "/api/flow-steps/:id", {
        middlewares: [requireOrganization],
    })
    async update(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as { id: string };
        const body = updateFlowStepSchema.parse(request.body);
        const result = await makeUpdateFlowStep().execute({
            organizationId: request.organizationId,
            id,
            data: body,
        });
        return reply.send(result);
    }

    @Route("DELETE", "/api/flow-steps/:id", {
        middlewares: [requireOrganization],
    })
    async remove(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as { id: string };
        await makeDeleteFlowStep().execute({
            organizationId: request.organizationId,
            id,
        });
        return reply.status(204).send();
    }
}
