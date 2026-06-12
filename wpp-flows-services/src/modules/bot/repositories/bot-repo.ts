export type BotStatus = "CONNECTING" | "ONLINE" | "OFFLINE" | "ERROR";
export type BotDesiredState = "CONNECTED" | "DISCONNECTED";

export interface Bot {
    id: string;
    organizationId: string;
    name: string;
    evolutionInstanceName: string;
    phoneNumber: string | null;
    status: BotStatus;
    desiredState: BotDesiredState;
    qrCode: string | null;
    webhookUrl: string | null;
    flowId: string | null;
    lastConnectedAt: Date | null;
    recoveryAttempts: number;
    lastRecoveryAt: Date | null;
    lastDisconnectNotifiedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface BotRepository {
    listByOrg(organizationId: string): Promise<Bot[]>;
    listAll(): Promise<Bot[]>;
    findById(id: string): Promise<Bot | null>;
    findByIdInOrg(organizationId: string, id: string): Promise<Bot | null>;
    findByInstanceName(instanceName: string): Promise<Bot | null>;
    create(data: {
        organizationId: string;
        name: string;
        evolutionInstanceName: string;
        phoneNumber?: string;
        webhookUrl?: string;
        flowId?: string | null;
    }): Promise<Bot>;
    update(
        id: string,
        data: Partial<{
            name: string;
            phoneNumber: string | null;
            webhookUrl: string | null;
            flowId: string | null;
            status: BotStatus;
            desiredState: BotDesiredState;
            qrCode: string | null;
            lastConnectedAt: Date | null;
            recoveryAttempts: number;
            lastRecoveryAt: Date | null;
            lastDisconnectNotifiedAt: Date | null;
        }>
    ): Promise<Bot>;
    delete(id: string): Promise<void>;
}
