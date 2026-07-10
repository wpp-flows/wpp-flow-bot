export type BotStatus = "CONNECTING" | "ONLINE" | "OFFLINE" | "ERROR";
export type BotDesiredState = "CONNECTED" | "DISCONNECTED";
export type BotProvider = "EVOLUTION" | "CLOUD_API";

export interface Bot {
    id: string;
    organizationId: string;
    name: string;
    provider: BotProvider;
    /** EVOLUTION only. */
    evolutionInstanceName: string | null;
    phoneNumber: string | null;
    status: BotStatus;
    desiredState: BotDesiredState;
    qrCode: string | null;
    webhookUrl: string | null;
    /** CLOUD_API — WhatsApp Business Account id. */
    wabaId: string | null;
    /** CLOUD_API — phone number id events are routed by. */
    phoneNumberId: string | null;
    /** CLOUD_API — encrypted long-lived access token (AES-256-GCM). */
    accessToken: string | null;
    displayPhoneNumber: string | null;
    verifiedName: string | null;
    tokenStatus: string | null;
    flowId: string | null;
    lastConnectedAt: Date | null;
    recoveryAttempts: number;
    lastRecoveryAt: Date | null;
    lastDisconnectNotifiedAt: Date | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface BotRepository {
    listByOrg(organizationId: string): Promise<Bot[]>;
    listAll(): Promise<Bot[]>;
    findById(id: string): Promise<Bot | null>;
    findByIdInOrg(organizationId: string, id: string): Promise<Bot | null>;
    findByInstanceName(instanceName: string): Promise<Bot | null>;
    /** CLOUD_API routing: resolve the bot that owns an inbound phone_number_id. */
    findByPhoneNumberId(phoneNumberId: string): Promise<Bot | null>;
    create(data: {
        organizationId: string;
        name: string;
        provider?: BotProvider;
        evolutionInstanceName?: string;
        phoneNumber?: string;
        webhookUrl?: string;
        flowId?: string | null;
        wabaId?: string;
        phoneNumberId?: string;
        accessToken?: string;
        displayPhoneNumber?: string;
        verifiedName?: string;
        tokenStatus?: string;
        status?: BotStatus;
    }): Promise<Bot>;
    update(
        id: string,
        data: Partial<{
            name: string;
            provider: BotProvider;
            evolutionInstanceName: string;
            phoneNumber: string | null;
            webhookUrl: string | null;
            flowId: string | null;
            status: BotStatus;
            desiredState: BotDesiredState;
            qrCode: string | null;
            wabaId: string | null;
            phoneNumberId: string | null;
            accessToken: string | null;
            displayPhoneNumber: string | null;
            verifiedName: string | null;
            tokenStatus: string | null;
            lastConnectedAt: Date | null;
            recoveryAttempts: number;
            lastRecoveryAt: Date | null;
            lastDisconnectNotifiedAt: Date | null;
            isActive: boolean;
        }>
    ): Promise<Bot>;
    delete(id: string): Promise<void>;
}
