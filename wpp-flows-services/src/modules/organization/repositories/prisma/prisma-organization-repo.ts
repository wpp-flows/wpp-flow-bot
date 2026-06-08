import { prisma } from "@/infrastructure/database/client";
import {
    DEFAULT_NOTIFICATION_PREFERENCES,
    type NotificationPreferences,
    type Organization,
    type OrganizationRepository,
} from "../organization-repo";

const toOrganization = (row: any): Organization => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    ownerId: row.ownerId,
    mercadoPagoAccessToken: row.mercadoPagoAccessToken ?? null,
    mercadoPagoPublicKey: row.mercadoPagoPublicKey ?? null,
    mercadoPagoWebhookSecret: row.mercadoPagoWebhookSecret ?? null,
    payoutPixKey: row.payoutPixKey ?? null,
    payoutPixKeyType: (row.payoutPixKeyType ?? null) as Organization["payoutPixKeyType"],
    notificationPreferences: {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        ...((row.notificationPreferences as Partial<NotificationPreferences>) ?? {}),
    },
    paymentTimeoutMinutes:
        typeof row.paymentTimeoutMinutes === "number" ? row.paymentTimeoutMinutes : 15,
    paymentCancelMessage: row.paymentCancelMessage ?? null,
    paymentTimeoutMessage: row.paymentTimeoutMessage ?? null,
    paymentReceivedMessage: row.paymentReceivedMessage ?? null,
    deliveryFee: row.deliveryFee != null ? String(row.deliveryFee) : "0",
    workingDaysOfWeek: (row.workingDaysOfWeek ?? []) as number[],
    workingStartTime: row.workingStartTime ?? null,
    workingEndTime: row.workingEndTime ?? null,
    outOfHoursMessage: row.outOfHoursMessage ?? null,
    localWorkingDaysOfWeek: (row.localWorkingDaysOfWeek ?? []) as number[],
    localWorkingStartTime: row.localWorkingStartTime ?? null,
    localWorkingEndTime: row.localWorkingEndTime ?? null,
    localOutOfHoursMessage: row.localOutOfHoursMessage ?? null,
    botCooldownMinutes:
        typeof row.botCooldownMinutes === "number" ? row.botCooldownMinutes : 60,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
});

export class PrismaOrganizationRepository implements OrganizationRepository {
    async findById(id: string): Promise<Organization | null> {
        const row = await prisma.organization.findUnique({ where: { id } });
        return row ? toOrganization(row) : null;
    }

    async findByOwnerId(ownerId: string): Promise<Organization | null> {
        const row = await prisma.organization.findUnique({ where: { ownerId } });
        return row ? toOrganization(row) : null;
    }

    async findBySlug(slug: string): Promise<Organization | null> {
        const row = await prisma.organization.findUnique({ where: { slug } });
        return row ? toOrganization(row) : null;
    }

    async create(data: {
        name: string;
        slug: string;
        ownerId: string;
    }): Promise<Organization> {
        const row = await prisma.organization.create({ data });
        return toOrganization(row);
    }

    async update(id: string, data: any): Promise<Organization> {
        const row = await prisma.organization.update({ where: { id }, data });
        return toOrganization(row);
    }
}
