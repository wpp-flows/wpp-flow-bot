import type { Order, ServiceType } from "@/modules/order/repositories/order-repo";

export interface Report {
    id: string;
    organizationId: string;
    serviceType: ServiceType;
    /** ISO date `YYYY-MM-DD` in São Paulo time. */
    reportDate: string;
    totalOrders: number;
    canceledCount: number;
    cashCount: number;
    revenue: string;
    paidRevenue: string;
    orders: Order[];
    generatedAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface UpsertReportInput {
    organizationId: string;
    serviceType: ServiceType;
    reportDate: string;
    totalOrders: number;
    canceledCount: number;
    cashCount: number;
    revenue: string;
    paidRevenue: string;
    orders: Order[];
}

export interface ReportRepository {
    upsert(input: UpsertReportInput): Promise<Report>;
    findOne(
        organizationId: string,
        serviceType: ServiceType,
        reportDate: string,
    ): Promise<Report | null>;
    listForOrg(
        organizationId: string,
        filters?: { serviceType?: ServiceType },
    ): Promise<Report[]>;
    deleteOne(
        organizationId: string,
        serviceType: ServiceType,
        reportDate: string,
    ): Promise<void>;
}
