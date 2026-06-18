import { prisma } from "@/infrastructure/database/client";
import type { Order, ServiceType } from "@/modules/order/repositories/order-repo";
import type {
    Report,
    ReportRepository,
    UpsertReportInput,
} from "../report-repo";

function isoDateOf(value: Date | string): string {
    if (typeof value === "string") return value.slice(0, 10);
    return value.toISOString().slice(0, 10);
}

function toReport(row: any): Report {
    return {
        id: row.id,
        organizationId: row.organizationId,
        serviceType: row.serviceType as ServiceType,
        reportDate: isoDateOf(row.reportDate),
        totalOrders: row.totalOrders,
        canceledCount: row.canceledCount,
        cashCount: row.cashCount,
        revenue: String(row.revenue),
        paidRevenue: String(row.paidRevenue),
        orders: (row.orders as Order[] | null) ?? [],
        generatedAt: row.generatedAt,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}

function reportDateToPrisma(date: string): Date {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
    if (!match) throw new Error(`Invalid report date: ${date}`);
    return new Date(`${date}T00:00:00.000Z`);
}

export class PrismaReportRepository implements ReportRepository {
    async upsert(input: UpsertReportInput): Promise<Report> {
        const reportDate = reportDateToPrisma(input.reportDate);
        const data = {
            totalOrders: input.totalOrders,
            canceledCount: input.canceledCount,
            cashCount: input.cashCount,
            revenue: input.revenue,
            paidRevenue: input.paidRevenue,
            orders: input.orders as any,
            generatedAt: new Date(),
        };
        const row = await prisma.report.upsert({
            where: {
                organizationId_serviceType_reportDate: {
                    organizationId: input.organizationId,
                    serviceType: input.serviceType,
                    reportDate,
                },
            },
            create: {
                organizationId: input.organizationId,
                serviceType: input.serviceType,
                reportDate,
                ...data,
            },
            update: data,
        });
        return toReport(row);
    }

    async findOne(
        organizationId: string,
        serviceType: ServiceType,
        reportDate: string,
    ): Promise<Report | null> {
        const row = await prisma.report.findUnique({
            where: {
                organizationId_serviceType_reportDate: {
                    organizationId,
                    serviceType,
                    reportDate: reportDateToPrisma(reportDate),
                },
            },
        });
        return row ? toReport(row) : null;
    }

    async listForOrg(
        organizationId: string,
        filters: { serviceType?: ServiceType } = {},
    ): Promise<Report[]> {
        const rows = await prisma.report.findMany({
            where: {
                organizationId,
                ...(filters.serviceType ? { serviceType: filters.serviceType } : {}),
            },
            orderBy: { reportDate: "desc" },
        });
        return rows.map(toReport);
    }
}
