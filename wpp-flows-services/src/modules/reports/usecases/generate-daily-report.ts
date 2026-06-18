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
    constructor(private readonly repo: ReportRepository) {}

    /**
     * Computes a single daily report from the `order` table and upserts it
     * into `report`. Idempotent — calling twice for the same key just
     * overwrites with fresh totals.
     *
     * Returns `null` for days with zero orders. We deliberately do NOT write
     * a row for empty days — they'd clutter the wallet list with
     * "0 pedidos · R$0" lines for every day the restaurant didn't sell on
     * that side. Callers (scheduler, backfill, GET endpoint) treat null as
     * "skip — nothing to show".
     */
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

        if (rows.length === 0) return null;

        let revenue = 0;
        let paidRevenue = 0;
        let cashCount = 0;
        let canceledCount = 0;
        for (const row of rows) {
            const total = Number.parseFloat(row.total.toString());
            if (row.status !== "CANCELED") revenue += total;
            else canceledCount += 1;
            if (row.paymentStatus === "PAID") paidRevenue += total;
            if (row.paymentProvider === "CASH") cashCount += 1;
        }

        const orders: Order[] = rows.map(toOrderShape);

        return this.repo.upsert({
            organizationId: input.organizationId,
            serviceType: input.serviceType,
            reportDate: input.date,
            totalOrders: rows.length,
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
