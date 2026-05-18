export type NotificationType =
    | "NEW_ORDER"
    | "PAYMENT_RECEIVED"
    | "BOT_OFFLINE"
    | "IDLE_CONVERSATION"
    | "GENERIC";

export interface Notification {
    id: string;
    organizationId: string;
    type: NotificationType;
    title: string;
    body: string | null;
    link: string | null;
    readAt: Date | null;
    createdAt: Date;
}

export interface CreateNotificationInput {
    organizationId: string;
    type: NotificationType;
    title: string;
    body?: string | null;
    link?: string | null;
}

export interface ListPaginatedInput {
    organizationId: string;
    /** Cursor: createdAt iso of the last item from the previous page. */
    cursor?: string;
    limit?: number;
}

export interface PaginatedNotifications {
    items: Notification[];
    nextCursor: string | null;
}

export interface NotificationRepository {
    create(input: CreateNotificationInput): Promise<Notification>;
    listRecent(organizationId: string, limit: number): Promise<Notification[]>;
    listPaginated(input: ListPaginatedInput): Promise<PaginatedNotifications>;
    countUnread(organizationId: string): Promise<number>;
    markRead(organizationId: string, id: string): Promise<Notification>;
    markAllRead(organizationId: string): Promise<number>;
    /**
     * Deletes notifications that were marked as read more than `olderThanMs`
     * milliseconds ago. Run lazily on every fetch — keeps the table small.
     */
    cleanupReadOlderThan(olderThanMs: number): Promise<number>;
}
