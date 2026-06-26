export type AdminNotificationType = "WA_VERSION_UPDATED";

export interface AdminNotification {
    id: string;
    type: AdminNotificationType;
    title: string;
    body: string;
    metadata: Record<string, unknown> | null;
    readAt: Date | null;
    createdAt: Date;
}

export interface CreateAdminNotificationInput {
    type: AdminNotificationType;
    title: string;
    body: string;
    metadata?: Record<string, unknown> | null;
}

export interface AdminNotificationRepository {
    list(limit?: number): Promise<AdminNotification[]>;
    countUnread(): Promise<number>;
    create(data: CreateAdminNotificationInput): Promise<AdminNotification>;
    markAsRead(id: string): Promise<AdminNotification | null>;
    markAllAsRead(): Promise<number>;
}
