export type PayoutPixKeyType = "cpf" | "cnpj" | "email" | "phone" | "random";

export interface NotificationPreferences {
    newOrders: boolean;
    botDisconnects: boolean;
    idleConversations: boolean;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
    newOrders: true,
    botDisconnects: true,
    idleConversations: false,
};

export interface Organization {
    id: string;
    name: string;
    slug: string;
    ownerId: string;
    mercadoPagoAccessToken: string | null;
    mercadoPagoPublicKey: string | null;
    mercadoPagoWebhookSecret: string | null;
    payoutPixKey: string | null;
    payoutPixKeyType: PayoutPixKeyType | null;
    notificationPreferences: NotificationPreferences;
    paymentTimeoutMinutes: number;
    paymentCancelMessage: string | null;
    paymentTimeoutMessage: string | null;
    paymentReceivedMessage: string | null;
    /** Flat delivery fee in BRL (decimal as string for currency safety). 0 = free. */
    deliveryFee: string;
    /** 0..6 (Sunday..Saturday). Empty = open every day. */
    workingDaysOfWeek: number[];
    /** "HH:MM" 24h. null = no time-of-day restriction. */
    workingStartTime: string | null;
    workingEndTime: string | null;
    outOfHoursMessage: string | null;
    botCooldownMinutes: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface OrganizationRepository {
    findById(id: string): Promise<Organization | null>;
    findByOwnerId(ownerId: string): Promise<Organization | null>;
    findBySlug(slug: string): Promise<Organization | null>;
    create(data: { name: string; slug: string; ownerId: string }): Promise<Organization>;
    update(
        id: string,
        data: Partial<{
            name: string;
            slug: string;
            mercadoPagoAccessToken: string | null;
            mercadoPagoPublicKey: string | null;
            mercadoPagoWebhookSecret: string | null;
            payoutPixKey: string | null;
            payoutPixKeyType: PayoutPixKeyType | null;
            notificationPreferences: NotificationPreferences;
            paymentTimeoutMinutes: number;
            paymentCancelMessage: string | null;
            paymentTimeoutMessage: string | null;
            paymentReceivedMessage: string | null;
            deliveryFee: number | string;
            workingDaysOfWeek: number[];
            workingStartTime: string | null;
            workingEndTime: string | null;
            outOfHoursMessage: string | null;
            botCooldownMinutes: number;
        }>,
    ): Promise<Organization>;
}
