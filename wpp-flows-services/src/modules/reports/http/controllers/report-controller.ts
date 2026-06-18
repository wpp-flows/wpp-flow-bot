import { Route } from "@/infrastructure/http/decorators/route-decorator";
import { requireOrganization } from "@/infrastructure/http/middlewares/auth";
import { NotFoundError } from "@/shared/exceptions/http";
import type { ServiceType } from "@/modules/order/repositories/order-repo";
import type { FastifyReply, FastifyRequest } from "fastify";
import {
    generateDailyReport,
    makeGetDailyReport,
    makeListDailyReports,
} from "../../usecases/factories";
import {
    dailyReportDateParamSchema,
    regenerateReportBodySchema,
} from "../schema";

function parseServiceType(raw: unknown): ServiceType | undefined {
    return raw === "DELIVERY" || raw === "LOCAL" ? raw : undefined;
}

export class ReportController {
    @Route("GET", "/api/reports/daily", { middlewares: [requireOrganization] })
    async listDaily(request: FastifyRequest, reply: FastifyReply) {
        const query = (request.query ?? {}) as { serviceType?: string };
        const result = await makeListDailyReports().execute(
            request.organizationId,
            { serviceType: parseServiceType(query.serviceType) },
        );
        return reply.send(result);
    }

    @Route("GET", "/api/reports/daily/:date", {
        middlewares: [requireOrganization],
    })
    async getDaily(request: FastifyRequest, reply: FastifyReply) {
        const { date } = dailyReportDateParamSchema.parse(request.params);
        const query = (request.query ?? {}) as { serviceType?: string };
        const result = await makeGetDailyReport().execute({
            organizationId: request.organizationId,
            date,
            serviceType: parseServiceType(query.serviceType),
        });
        if (!result) throw new NotFoundError("Relatório");
        return reply.send(result);
    }

    @Route("POST", "/api/reports/regenerate", {
        middlewares: [requireOrganization],
    })
    async regenerate(request: FastifyRequest, reply: FastifyReply) {
        const body = regenerateReportBodySchema.parse(request.body);
        const services: ServiceType[] = body.serviceType
            ? [body.serviceType]
            : ["DELIVERY", "LOCAL"];

        const results = await Promise.all(
            services.map((s) =>
                generateDailyReport.execute({
                    organizationId: request.organizationId,
                    serviceType: s,
                    date: body.date,
                }),
            ),
        );

        const generated = results.filter((r) => r != null).length;
        return reply.send({
            generated,
            skipped: results.length - generated,
            date: body.date,
        });
    }
}
