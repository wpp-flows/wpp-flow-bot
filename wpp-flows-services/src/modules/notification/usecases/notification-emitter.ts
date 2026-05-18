import type { OrganizationRepository } from "@/modules/organization/repositories/organization-repo";
import type { NotificationType } from "../repositories/notification-repo";
import type { CreateNotificationUseCase } from "./notification-usecases";

interface EmitInput {
    organizationId: string;
    type: NotificationType;
    title: string;
    body?: string | null;
    link?: string | null;
    /**
     * Which `notificationPreferences` key gates this emission. When omitted
     * (or unrecognized), the notification is always created.
     */
    requirePreference?: keyof NonNullable<
        Awaited<ReturnType<OrganizationRepository["findById"]>>
    >["notificationPreferences"];
}

/**
 * Thin wrapper around the create-notification use case that checks the org's
 * preferences before emitting. Always swallows errors and logs them — emitting
 * a notification is best-effort and must never abort the calling flow.
 */
export class NotificationEmitter {
    constructor(
        private readonly orgRepo: OrganizationRepository,
        private readonly createNotification: CreateNotificationUseCase,
    ) {}

    async emit(input: EmitInput): Promise<void> {
        try {
            if (input.requirePreference) {
                const org = await this.orgRepo.findById(input.organizationId);
                const enabled = org?.notificationPreferences?.[input.requirePreference];
                if (!enabled) return;
            }
            await this.createNotification.execute({
                organizationId: input.organizationId,
                type: input.type,
                title: input.title,
                body: input.body ?? null,
                link: input.link ?? null,
            });
        } catch (err) {
            console.warn("NotificationEmitter.emit failed:", err);
        }
    }
}
