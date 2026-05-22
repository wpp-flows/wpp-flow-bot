export type BotStatus = "CONNECTING" | "ONLINE" | "OFFLINE" | "ERROR";

export interface Bot {
    id: string;
    organizationId: string;
    name: string;
    evolutionInstanceName: string;
    phoneNumber: string | null;
    status: BotStatus;
    qrCode: string | null;
    webhookUrl: string | null;
    flowId: string | null;
    lastConnectedAt: Date | null;
    workingDaysOfWeek: number[];
    /** "HH:MM" 24h. Null = no time-of-day restriction. */
    workingStartTime: string | null;
    workingEndTime: string | null;
    outOfHoursMessage: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface BotRepository {
    listByOrg(organizationId: string): Promise<Bot[]>;
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
            qrCode: string | null;
            lastConnectedAt: Date | null;
            workingDaysOfWeek: number[];
            workingStartTime: string | null;
            workingEndTime: string | null;
            outOfHoursMessage: string | null;
        }>
    ): Promise<Bot>;
    delete(id: string): Promise<void>;
}
