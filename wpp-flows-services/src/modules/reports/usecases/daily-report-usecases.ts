import type { Order, ServiceType } from "@/modules/order/repositories/order-repo";
import type { ReportRepository } from "../repositories/report-repo";
import { GenerateDailyReportUseCase, spDateOf } from "./generate-daily-report";

export interface DailyReportSummary {
    /** Always the SP-local date as `YYYY-MM-DD`. */
    date: string;
    count: number;
    revenue: string;
    paidRevenue: string;
    cashCount: number;
    canceledCount: number;
}

export interface DailyReportDetail {
    date: string;
    summary: DailyReportSummary;
    orders: Order[];
}

export class ListDailyReportsUseCase {
    constructor(private readonly repo: ReportRepository) {}

    async execute(
        organizationId: string,
        filters: { serviceType?: ServiceType } = {},
    ): Promise<DailyReportSummary[]> {
        const reports = await this.repo.listForOrg(organizationId, {
            serviceType: filters.serviceType,
        });

        if (filters.serviceType) {
            return reports.map((r) => ({
                date: r.reportDate,
                count: r.totalOrders,
                revenue: r.revenue,
                paidRevenue: r.paidRevenue,
                cashCount: r.cashCount,
                canceledCount: r.canceledCount,
            }));
        }

        const byDate = new Map<string, DailyReportSummary>();
        for (const r of reports) {
            const existing = byDate.get(r.reportDate);
            if (!existing) {
                byDate.set(r.reportDate, {
                    date: r.reportDate,
                    count: r.totalOrders,
                    revenue: r.revenue,
                    paidRevenue: r.paidRevenue,
                    cashCount: r.cashCount,
                    canceledCount: r.canceledCount,
                });
                continue;
            }
            existing.count += r.totalOrders;
            existing.revenue = sumString(existing.revenue, r.revenue);
            existing.paidRevenue = sumString(existing.paidRevenue, r.paidRevenue);
            existing.cashCount += r.cashCount;
            existing.canceledCount += r.canceledCount;
        }
        return Array.from(byDate.values()).sort((a, b) =>
            a.date < b.date ? 1 : -1,
        );
    }
}

export class GetDailyReportUseCase {
    constructor(
        private readonly repo: ReportRepository,
        private readonly generator: GenerateDailyReportUseCase,
    ) {}

    async execute(input: {
        organizationId: string;
        date: string;
        serviceType?: ServiceType;
    }): Promise<DailyReportDetail | null> {
        const today = spDateOf(0);
        const isToday = input.date === today;

        const services: ServiceType[] = input.serviceType
            ? [input.serviceType]
            : ["DELIVERY", "LOCAL"];

        const reports = await Promise.all(
            services.map(async (s) => {
                if (isToday) {
                    return this.generator.execute({
                        organizationId: input.organizationId,
                        serviceType: s,
                        date: input.date,
                    });
                }
                return this.repo.findOne(input.organizationId, s, input.date);
            }),
        );

        const present = reports.filter((r): r is NonNullable<typeof r> => r != null);
        if (present.length === 0) return null;

        let count = 0;
        let revenue = 0;
        let paidRevenue = 0;
        let cashCount = 0;
        let canceledCount = 0;
        const orders: Order[] = [];
        for (const r of present) {
            count += r.totalOrders;
            revenue += Number.parseFloat(r.revenue);
            paidRevenue += Number.parseFloat(r.paidRevenue);
            cashCount += r.cashCount;
            canceledCount += r.canceledCount;
            orders.push(...r.orders);
        }

        if (count === 0) return null;

        return {
            date: input.date,
            summary: {
                date: input.date,
                count,
                revenue: revenue.toFixed(2),
                paidRevenue: paidRevenue.toFixed(2),
                cashCount,
                canceledCount,
            },
            orders,
        };
    }
}

function sumString(a: string, b: string): string {
    return (Number.parseFloat(a) + Number.parseFloat(b)).toFixed(2);
}
