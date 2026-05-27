import { Route } from "@/infrastructure/http/decorators/route-decorator";
import { requireOrganization } from "@/infrastructure/http/middlewares/auth";
import { ORDER_TEMPLATE_VARIABLES } from "@/modules/organization/order-template";
import type { FastifyReply, FastifyRequest } from "fastify";

export class TemplateVariablesController {
    @Route("GET", "/api/organization/template-variables", {
        middlewares: [requireOrganization],
    })
    async list(_request: FastifyRequest, reply: FastifyReply) {
        return reply.send(ORDER_TEMPLATE_VARIABLES);
    }
}
