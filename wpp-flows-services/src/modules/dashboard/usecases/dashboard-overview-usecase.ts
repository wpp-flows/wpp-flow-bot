import { prisma } from "@/infrastructure/database/client";

export interface DashboardOrdersByDay {
    /** ISO date (YYYY-MM-DD) in UTC. */
    date: string;
    orders: number;
    revenue: string;
}

export interface DashboardStatusBucket {
    status: "RECEIVED" | "PREPARING" | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELED";
    count: number;
}

export interface DashboardTopItem {
    itemId: string;
    name: string;
    qty: number;
}

export interface DashboardOverview {
    todayOrders: number;
    todayRevenue: string;
    weekRevenue: string;
    prevWeekRevenue: string;
    activeConversations: number;
    newCustomersThisMonth: number;
    onlineBots: number;
    totalBots: number;
    /** Last 14 days, oldest first. */
    ordersByDay: DashboardOrdersByDay[];
    /** Active orders this week, grouped by status. */
    statusBreakdown: DashboardStatusBucket[];
    /** Top 5 items by quantity in the last 7 days. */
    topItems: DashboardTopItem[];
}

function startOfDayUTC(d: Date): Date {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function isoDate(d: Date): string {
    return d.toISOString().slice(0, 10);
}

/**
 * One-shot dashboard aggregation. Done with a handful of focused queries instead
 * of one big join so each chart's data can change shape independently without
 * cascading rewrites. Decimals come back as strings to preserve precision.
 */
export class GetDashboardOverviewUseCase {
    async execute(organizationId: string): Promise<DashboardOverview> {
        const now = new Date();
        const today = startOfDayUTC(now);
        const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const fourteenDaysAgo = new Date(today.getTime() - 13 * 24 * 60 * 60 * 1000);
        const prevWeekStart = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);
        const startOfMonth = new Date(
            Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1),
        );

        const paidWhere = {
            organizationId,
            paymentStatus: "PAID",
            status: { not: "CANCELED" },
        } as const;

        const [
            todayAgg,
            weekAgg,
            prevWeekAgg,
            activeConversations,
            newCustomersThisMonth,
            allBots,
            ordersByDayRows,
            statusRows,
            topItemRows,
        ] = await Promise.all([
            prisma.order.aggregate({
                where: { ...paidWhere, createdAt: { gte: today } },
                _count: { _all: true },
                _sum: { total: true },
            }),
            prisma.order.aggregate({
                where: { ...paidWhere, createdAt: { gte: sevenDaysAgo } },
                _sum: { total: true },
            }),
            prisma.order.aggregate({
                where: {
                    ...paidWhere,
                    createdAt: { gte: prevWeekStart, lt: sevenDaysAgo },
                },
                _sum: { total: true },
            }),
            prisma.conversation.count({
                where: { organizationId, status: "OPEN" },
            }),
            prisma.customer.count({
                where: { organizationId, createdAt: { gte: startOfMonth } },
            }),
            prisma.bot.findMany({
                where: { organizationId },
                select: { status: true },
            }),
            prisma.order.findMany({
                where: { ...paidWhere, createdAt: { gte: fourteenDaysAgo } },
                select: { createdAt: true, total: true },
            }),
            prisma.order.groupBy({
                by: ["status"],
                where: { ...paidWhere, createdAt: { gte: sevenDaysAgo } },
                _count: { _all: true },
            }),
            prisma.order.findMany({
                where: { ...paidWhere, createdAt: { gte: sevenDaysAgo } },
                select: { items: true },
            }),
        ]);

        const ordersByDay = bucketOrdersByDay(ordersByDayRows, fourteenDaysAgo, today);
        const statusBreakdown: DashboardStatusBucket[] = statusRows.map((row) => ({
            status: row.status,
            count: row._count._all,
        }));
        const topItems = aggregateTopItems(topItemRows);

        return {
            todayOrders: todayAgg._count._all,
            todayRevenue: decimalToString(todayAgg._sum.total),
            weekRevenue: decimalToString(weekAgg._sum.total),
            prevWeekRevenue: decimalToString(prevWeekAgg._sum.total),
            activeConversations,
            newCustomersThisMonth,
            onlineBots: allBots.filter((b) => b.status === "ONLINE").length,
            totalBots: allBots.length,
            ordersByDay,
            statusBreakdown,
            topItems,
        };
    }
}

function decimalToString(value: { toString(): string } | null | undefined): string {
    if (!value) return "0";
    return value.toString();
}

function bucketOrdersByDay(
    rows: { createdAt: Date; total: { toString(): string } }[],
    from: Date,
    today: Date,
): DashboardOrdersByDay[] {
    const buckets = new Map<string, { orders: number; revenue: number }>();
    // Pre-seed every day in the window so the chart never has gaps.
    for (
        let cursor = new Date(from);
        cursor.getTime() <= today.getTime();
        cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000)
    ) {
        buckets.set(isoDate(cursor), { orders: 0, revenue: 0 });
    }
    for (const row of rows) {
        const key = isoDate(startOfDayUTC(row.createdAt));
        const bucket = buckets.get(key);
        if (!bucket) continue;
        bucket.orders += 1;
        bucket.revenue += Number.parseFloat(row.total.toString());
    }
    return Array.from(buckets.entries())
        .sort((a, b) => (a[0] < b[0] ? -1 : 1))
        .map(([date, b]) => ({
            date,
            orders: b.orders,
            revenue: b.revenue.toFixed(2),
        }));
}

function aggregateTopItems(
    rows: { items: unknown }[],
): DashboardTopItem[] {
    type ItemSnapshot = { itemId: string; name: string; qty: number };
    const totals = new Map<string, { name: string; qty: number }>();
    for (const row of rows) {
        const items = (row.items as ItemSnapshot[] | null) ?? [];
        for (const it of items) {
            if (!it?.itemId) continue;
            const current = totals.get(it.itemId);
            const qty = Number(it.qty ?? 0);
            if (!Number.isFinite(qty) || qty <= 0) continue;
            if (current) current.qty += qty;
            else totals.set(it.itemId, { name: it.name ?? "Item", qty });
        }
    }
    return Array.from(totals.entries())
        .map(([itemId, v]) => ({ itemId, name: v.name, qty: v.qty }))
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 5);
}
