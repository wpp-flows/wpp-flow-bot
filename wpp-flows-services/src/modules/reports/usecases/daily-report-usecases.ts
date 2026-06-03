import { prisma } from "@/infrastructure/database/client";
import type { Order } from "@/modules/order/repositories/order-repo";

const REPORT_TZ = "America/Sao_Paulo";

export interface DailyReportSummary {
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

interface DailyAggRow {
    date: string;
    count: bigint;
    revenue: string | null;
    paid_revenue: string | null;
    cash_count: bigint;
    canceled_count: bigint;
}

export class ListDailyReportsUseCase {
    async execute(organizationId: string): Promise<DailyReportSummary[]> {
        const rows = await prisma.$queryRaw<DailyAggRow[]>`
            SELECT
                to_char(
                    date_trunc('day', "createdAt" AT TIME ZONE ${REPORT_TZ}),
                    'YYYY-MM-DD'
                ) AS "date",
                COUNT(*) AS "count",
                COALESCE(
                    SUM(CASE WHEN "status" <> 'CANCELED' THEN "total" END),
                    0
                )::text AS "revenue",
                COALESCE(
                    SUM(CASE WHEN "paymentStatus" = 'PAID' THEN "total" END),
                    0
                )::text AS "paid_revenue",
                COUNT(*) FILTER (WHERE "paymentProvider" = 'CASH') AS "cash_count",
                COUNT(*) FILTER (WHERE "status" = 'CANCELED') AS "canceled_count"
            FROM "order"
            WHERE "organizationId" = ${organizationId}
            GROUP BY 1
            ORDER BY 1 DESC
        `;
        return rows.map((row) => ({
            date: row.date,
            count: Number(row.count),
            revenue: row.revenue ?? "0",
            paidRevenue: row.paid_revenue ?? "0",
            cashCount: Number(row.cash_count),
            canceledCount: Number(row.canceled_count),
        }));
    }
}

export class GetDailyReportUseCase {
    async execute(input: {
        organizationId: string;
        date: string;
    }): Promise<DailyReportDetail | null> {
        const range = parseDayRange(input.date);
        if (!range) return null;

        const orders = await prisma.order.findMany({
            where: {
                organizationId: input.organizationId,
                createdAt: { gte: range.from, lt: range.to },
            },
            orderBy: { createdAt: "asc" },
        });
        if (orders.length === 0) return null;

        let revenue = 0;
        let paidRevenue = 0;
        let cashCount = 0;
        let canceledCount = 0;
        for (const o of orders) {
            const total = Number.parseFloat(o.total.toString());
            if (o.status !== "CANCELED") revenue += total;
            else canceledCount += 1;
            if (o.paymentStatus === "PAID") paidRevenue += total;
            if (o.paymentProvider === "CASH") cashCount += 1;
        }

        return {
            date: input.date,
            summary: {
                date: input.date,
                count: orders.length,
                revenue: revenue.toFixed(2),
                paidRevenue: paidRevenue.toFixed(2),
                cashCount,
                canceledCount,
            },
            orders: orders.map(toOrderShape),
        };
    }
}

function parseDayRange(date: string): { from: Date; to: Date } | null {
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

function toOrderShape(row: any): Order {
    return {
        id: row.id,
        organizationId: row.organizationId,
        customerId: row.customerId,
        conversationId: row.conversationId,
        sequence: row.sequence,
        items: row.items ?? [],
        subtotal: String(row.subtotal),
        discount: row.discount == null ? null : String(row.discount),
        total: String(row.total),
        status: row.status,
        observation: row.observation,
        address: row.address,
        deliveryMode: row.deliveryMode ?? "DELIVERY",
        deliveryFee: row.deliveryFee != null ? String(row.deliveryFee) : "0",
        couponCode: row.couponCode ?? null,
        couponDiscount:
            row.couponDiscount == null ? null : String(row.couponDiscount),
        paymentStatus: row.paymentStatus,
        paymentProvider: row.paymentProvider,
        paymentProviderRef: row.paymentProviderRef,
        paymentLink: row.paymentLink ?? null,
        receiptUrl: row.receiptUrl,
        cashChangeFor:
            row.cashChangeFor == null ? null : String(row.cashChangeFor),
        appliedPromotionIds: (row.appliedPromotionIds as string[] | null) ?? null,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}
