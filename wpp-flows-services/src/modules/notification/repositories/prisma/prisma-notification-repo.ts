import { prisma } from "@/infrastructure/database/client";
import { NotFoundError } from "@/shared/exceptions/http";
import type {
    CreateNotificationInput,
    ListPaginatedInput,
    Notification,
    NotificationRepository,
    NotificationType,
    PaginatedNotifications,
} from "../notification-repo";

const toNotification = (row: any): Notification => ({
    id: row.id,
    organizationId: row.organizationId,
    type: row.type as NotificationType,
    title: row.title,
    body: row.body ?? null,
    link: row.link ?? null,
    readAt: row.readAt ?? null,
    createdAt: row.createdAt,
});

export class PrismaNotificationRepository implements NotificationRepository {
    async create(input: CreateNotificationInput): Promise<Notification> {
        const row = await prisma.notification.create({
            data: {
                organizationId: input.organizationId,
                type: input.type,
                title: input.title,
                body: input.body ?? null,
                link: input.link ?? null,
            },
        });
        return toNotification(row);
    }

    async listRecent(
        organizationId: string,
        limit: number,
    ): Promise<Notification[]> {
        const rows = await prisma.notification.findMany({
            where: { organizationId },
            orderBy: { createdAt: "desc" },
            take: limit,
        });
        return rows.map(toNotification);
    }

    async listPaginated(input: ListPaginatedInput): Promise<PaginatedNotifications> {
        const limit = input.limit ?? 20;
        const rows = await prisma.notification.findMany({
            where: {
                organizationId: input.organizationId,
                ...(input.cursor
                    ? { createdAt: { lt: new Date(input.cursor) } }
                    : {}),
            },
            orderBy: { createdAt: "desc" },
            take: limit + 1,
        });
        const items = rows.slice(0, limit).map(toNotification);
        const nextCursor =
            rows.length > limit ? items[items.length - 1]!.createdAt.toISOString() : null;
        return { items, nextCursor };
    }

    async countUnread(organizationId: string): Promise<number> {
        return prisma.notification.count({
            where: { organizationId, readAt: null },
        });
    }

    async markRead(organizationId: string, id: string): Promise<Notification> {
        const existing = await prisma.notification.findFirst({
            where: { id, organizationId },
        });
        if (!existing) throw new NotFoundError("Notification");
        if (existing.readAt) return toNotification(existing);
        const row = await prisma.notification.update({
            where: { id },
            data: { readAt: new Date() },
        });
        return toNotification(row);
    }

    async markAllRead(organizationId: string): Promise<number> {
        const result = await prisma.notification.updateMany({
            where: { organizationId, readAt: null },
            data: { readAt: new Date() },
        });
        return result.count;
    }

    async cleanupReadOlderThan(olderThanMs: number): Promise<number> {
        const cutoff = new Date(Date.now() - olderThanMs);
        const result = await prisma.notification.deleteMany({
            where: { readAt: { lt: cutoff } },
        });
        return result.count;
    }

    async deleteAllForOrg(organizationId: string): Promise<number> {
        const result = await prisma.notification.deleteMany({
            where: { organizationId },
        });
        return result.count;
    }
}
