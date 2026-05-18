import { Route } from "@/infrastructure/http/decorators/route-decorator";
import { requireOrganization } from "@/infrastructure/http/middlewares/auth";
import type { FastifyReply, FastifyRequest } from "fastify";
import { makeGetDashboardOverview } from "../../usecases/factories";

export class DashboardController {
    @Route("GET", "/api/dashboard/overview", {
        middlewares: [requireOrganization],
    })
    async overview(request: FastifyRequest, reply: FastifyReply) {
        const result = await makeGetDashboardOverview().execute(
            request.organizationId,
        );
        return reply.send(result);
    }
}
