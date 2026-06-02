import { Route } from "@/infrastructure/http/decorators/route-decorator";
import { requireOrganization } from "@/infrastructure/http/middlewares/auth";
import { NotFoundError } from "@/shared/exceptions/http";
import type { FastifyReply, FastifyRequest } from "fastify";
import {
    makeGetDailyReport,
    makeListDailyReports,
} from "../../usecases/factories";
import { dailyReportDateParamSchema } from "../schema";

export class ReportController {
    @Route("GET", "/api/reports/daily", { middlewares: [requireOrganization] })
    async listDaily(request: FastifyRequest, reply: FastifyReply) {
        const result = await makeListDailyReports().execute(
            request.organizationId,
        );
        return reply.send(result);
    }

    @Route("GET", "/api/reports/daily/:date", {
        middlewares: [requireOrganization],
    })
    async getDaily(request: FastifyRequest, reply: FastifyReply) {
        const { date } = dailyReportDateParamSchema.parse(request.params);
        const result = await makeGetDailyReport().execute({
            organizationId: request.organizationId,
            date,
        });
        if (!result) throw new NotFoundError("Relatório");
        return reply.send(result);
    }
}
