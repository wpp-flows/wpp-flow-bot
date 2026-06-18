import { prisma } from "@/infrastructure/database/client";
import type { Order, ServiceType } from "@/modules/order/repositories/order-repo";
import type { Report, ReportRepository } from "../repositories/report-repo";
import { toOrderShape } from "./order-shape";

const REPORT_TZ = "America/Sao_Paulo";

export interface GenerateDailyReportInput {
    organizationId: string;
    serviceType: ServiceType;
    /** ISO `YYYY-MM-DD` in São Paulo time. */
    date: string;
}

export class GenerateDailyReportUseCase {
    constructor(private readonly repo: ReportRepository) { }

    async execute(input: GenerateDailyReportInput): Promise<Report | null> {
        const range = parseDayRange(input.date);
        if (!range) {
            throw new Error(`Invalid report date: ${input.date}`);
        }

        const rows = await prisma.order.findMany({
            where: {
                organizationId: input.organizationId,
                serviceType: input.serviceType,
                createdAt: { gte: range.from, lt: range.to },
            },
            include: { customer: { select: { name: true } } },
            orderBy: { createdAt: "asc" },
        });

        let totalOrders = 0;
        let revenue = 0;
        let paidRevenue = 0;
        let cashCount = 0;
        let canceledCount = 0;
        const snapshotRows: typeof rows = [];

        for (const row of rows) {
            if (row.status === "CANCELED") {
                canceledCount += 1;
                snapshotRows.push(row);
                continue;
            }

            const isSettled =
                row.paymentStatus === "PAID" || row.billId != null;
            if (!isSettled) continue;

            const total = Number.parseFloat(row.total.toString());
            totalOrders += 1;
            revenue += total;
            paidRevenue += total;
            if (row.paymentProvider === "CASH") cashCount += 1;
            snapshotRows.push(row);
        }

        if (totalOrders === 0) {
            await this.repo.deleteOne(
                input.organizationId,
                input.serviceType,
                input.date,
            );
            return null;
        }

        const orders: Order[] = snapshotRows.map(toOrderShape);

        return this.repo.upsert({
            organizationId: input.organizationId,
            serviceType: input.serviceType,
            reportDate: input.date,
            totalOrders,
            canceledCount,
            cashCount,
            revenue: revenue.toFixed(2),
            paidRevenue: paidRevenue.toFixed(2),
            orders,
        });
    }
}

export function parseDayRange(
    date: string,
): { from: Date; to: Date } | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
    if (!match) return null;
    const [, y, m, d] = match;
    const year = Number(y);
    const month = Number(m) - 1;
    const day = Number(d);
    const from = new Date(Date.UTC(year, month, day, 3, 0, 0));
    const to = new Date(Date.UTC(year, month, day + 1, 3, 0, 0));
    return { from, to };
}

export function spDateOf(daysAgo: number, now: Date = new Date()): string {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: REPORT_TZ,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000));
    const get = (type: string) =>
        parts.find((p) => p.type === type)?.value ?? "";
    return `${get("year")}-${get("month")}-${get("day")}`;
}
