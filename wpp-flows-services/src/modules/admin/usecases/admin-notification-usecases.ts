import { NotFoundError } from "@/shared/exceptions/http";
import type {
    AdminNotification,
    AdminNotificationRepository,
    CreateAdminNotificationInput,
} from "../repositories/admin-notification-repo";

export class ListAdminNotificationsUseCase {
    constructor(private readonly repo: AdminNotificationRepository) { }

    async execute(): Promise<{
        items: AdminNotification[];
        unread: number;
    }> {
        const [items, unread] = await Promise.all([
            this.repo.list(50),
            this.repo.countUnread(),
        ]);
        return { items, unread };
    }
}

export class CreateAdminNotificationUseCase {
    constructor(private readonly repo: AdminNotificationRepository) { }

    execute(input: CreateAdminNotificationInput): Promise<AdminNotification> {
        return this.repo.create(input);
    }
}

export class MarkAdminNotificationReadUseCase {
    constructor(private readonly repo: AdminNotificationRepository) { }

    async execute(id: string): Promise<AdminNotification> {
        const result = await this.repo.markAsRead(id);
        if (!result) throw new NotFoundError("AdminNotification");
        return result;
    }
}

export class MarkAllAdminNotificationsReadUseCase {
    constructor(private readonly repo: AdminNotificationRepository) { }

    async execute(): Promise<{ markedCount: number }> {
        const count = await this.repo.markAllAsRead();
        return { markedCount: count };
    }
}
