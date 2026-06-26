import { prisma } from "@/infrastructure/database/client";
import type {
    AdminNotification,
    AdminNotificationRepository,
    AdminNotificationType,
    CreateAdminNotificationInput,
} from "../admin-notification-repo";

const toModel = (row: any): AdminNotification => ({
    id: row.id,
    type: row.type as AdminNotificationType,
    title: row.title,
    body: row.body,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    readAt: row.readAt ?? null,
    createdAt: row.createdAt,
});

export class PrismaAdminNotificationRepository
    implements AdminNotificationRepository {
    async list(limit = 50): Promise<AdminNotification[]> {
        const rows = await prisma.adminNotification.findMany({
            orderBy: { createdAt: "desc" },
            take: limit,
        });
        return rows.map(toModel);
    }

    async countUnread(): Promise<number> {
        return prisma.adminNotification.count({ where: { readAt: null } });
    }

    async create(data: CreateAdminNotificationInput): Promise<AdminNotification> {
        const row = await prisma.adminNotification.create({
            data: {
                type: data.type,
                title: data.title,
                body: data.body,
                metadata: data.metadata == null ? undefined : (data.metadata as any),
            },
        });
        return toModel(row);
    }

    async markAsRead(id: string): Promise<AdminNotification | null> {
        const row = await prisma.adminNotification.findUnique({ where: { id } });
        if (!row) return null;
        if (row.readAt) return toModel(row);
        const updated = await prisma.adminNotification.update({
            where: { id },
            data: { readAt: new Date() },
        });
        return toModel(updated);
    }

    async markAllAsRead(): Promise<number> {
        const result = await prisma.adminNotification.updateMany({
            where: { readAt: null },
            data: { readAt: new Date() },
        });
        return result.count;
    }
}
