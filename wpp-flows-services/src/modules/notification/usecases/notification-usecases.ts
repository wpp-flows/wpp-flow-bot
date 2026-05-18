import type {
    CreateNotificationInput,
    Notification,
    NotificationRepository,
    PaginatedNotifications,
} from "../repositories/notification-repo";

/** 24 hours after readAt, the notification is purged. */
const READ_TTL_MS = 24 * 60 * 60 * 1000;

async function withCleanup<T>(
    repo: NotificationRepository,
    body: () => Promise<T>,
): Promise<T> {
    // Best-effort: cleanup runs lazily on every list/recent fetch but never blocks
    // the response if it errors (e.g. transient DB hiccup).
    repo.cleanupReadOlderThan(READ_TTL_MS).catch((err) =>
        console.warn("notification cleanup failed:", err),
    );
    return body();
}

export class CreateNotificationUseCase {
    constructor(private readonly repo: NotificationRepository) {}
    execute(input: CreateNotificationInput): Promise<Notification> {
        return this.repo.create(input);
    }
}

export class ListRecentNotificationsUseCase {
    constructor(private readonly repo: NotificationRepository) {}
    execute(input: { organizationId: string; limit?: number }): Promise<Notification[]> {
        return withCleanup(this.repo, () =>
            this.repo.listRecent(input.organizationId, input.limit ?? 5),
        );
    }
}

export class ListNotificationsUseCase {
    constructor(private readonly repo: NotificationRepository) {}
    execute(input: {
        organizationId: string;
        cursor?: string;
        limit?: number;
    }): Promise<PaginatedNotifications> {
        return withCleanup(this.repo, () =>
            this.repo.listPaginated({
                organizationId: input.organizationId,
                cursor: input.cursor,
                limit: input.limit,
            }),
        );
    }
}

export class CountUnreadNotificationsUseCase {
    constructor(private readonly repo: NotificationRepository) {}
    execute(organizationId: string): Promise<number> {
        return this.repo.countUnread(organizationId);
    }
}

export class MarkNotificationReadUseCase {
    constructor(private readonly repo: NotificationRepository) {}
    execute(input: { organizationId: string; id: string }): Promise<Notification> {
        return this.repo.markRead(input.organizationId, input.id);
    }
}

export class MarkAllNotificationsReadUseCase {
    constructor(private readonly repo: NotificationRepository) {}
    execute(organizationId: string): Promise<{ count: number }> {
        return this.repo
            .markAllRead(organizationId)
            .then((count) => ({ count }));
    }
}
