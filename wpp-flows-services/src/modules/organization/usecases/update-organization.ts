import { ConflictError, NotFoundError } from "@/shared/exceptions/http";
import type {
    NotificationPreferences,
    Organization,
    OrganizationRepository,
    PayoutPixKeyType,
} from "../repositories/organization-repo";

export interface UpdateOrganizationInput {
    ownerId: string;
    name?: string;
    slug?: string;
    mercadoPagoAccessToken?: string | null;
    mercadoPagoPublicKey?: string | null;
    mercadoPagoWebhookSecret?: string | null;
    payoutPixKey?: string | null;
    payoutPixKeyType?: PayoutPixKeyType | null;
    notificationPreferences?: NotificationPreferences;
    paymentTimeoutMinutes?: number;
    paymentCancelMessage?: string | null;
    paymentTimeoutMessage?: string | null;
    paymentReceivedMessage?: string | null;
    deliveryFee?: number;
    workingDaysOfWeek?: number[];
    workingStartTime?: string | null;
    workingEndTime?: string | null;
    outOfHoursMessage?: string | null;
    botCooldownMinutes?: number;
}

export class UpdateOrganizationUseCase {
    constructor(private readonly repo: OrganizationRepository) {}

    async execute(input: UpdateOrganizationInput): Promise<Organization> {
        const org = await this.repo.findByOwnerId(input.ownerId);
        if (!org) throw new NotFoundError("Organization");

        if (input.slug && input.slug !== org.slug) {
            const conflict = await this.repo.findBySlug(input.slug);
            if (conflict) throw new ConflictError("Slug already taken.");
        }

        return this.repo.update(org.id, {
            name: input.name,
            slug: input.slug,
            mercadoPagoAccessToken: input.mercadoPagoAccessToken,
            mercadoPagoPublicKey: input.mercadoPagoPublicKey,
            mercadoPagoWebhookSecret: input.mercadoPagoWebhookSecret,
            payoutPixKey: input.payoutPixKey,
            payoutPixKeyType: input.payoutPixKeyType,
            notificationPreferences: input.notificationPreferences,
            paymentTimeoutMinutes: input.paymentTimeoutMinutes,
            paymentCancelMessage: input.paymentCancelMessage,
            paymentTimeoutMessage: input.paymentTimeoutMessage,
            paymentReceivedMessage: input.paymentReceivedMessage,
            deliveryFee: input.deliveryFee,
            workingDaysOfWeek: input.workingDaysOfWeek,
            workingStartTime: input.workingStartTime,
            workingEndTime: input.workingEndTime,
            outOfHoursMessage: input.outOfHoursMessage,
            botCooldownMinutes: input.botCooldownMinutes,
        });
    }
}
