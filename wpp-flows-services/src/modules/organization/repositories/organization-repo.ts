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
        }>,
    ): Promise<Organization>;
}
