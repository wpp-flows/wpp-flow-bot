import { prisma } from "@/infrastructure/database/client";
import type {
    Bot,
    BotDesiredState,
    BotRepository,
    BotStatus,
} from "../bot-repo";

const toBot = (row: any): Bot => ({
    id: row.id,
    organizationId: row.organizationId,
    name: row.name,
    evolutionInstanceName: row.evolutionInstanceName,
    phoneNumber: row.phoneNumber,
    status: row.status as BotStatus,
    desiredState: row.desiredState as BotDesiredState,
    qrCode: row.qrCode,
    webhookUrl: row.webhookUrl,
    flowId: row.flowId,
    lastConnectedAt: row.lastConnectedAt,
    recoveryAttempts: row.recoveryAttempts,
    lastRecoveryAt: row.lastRecoveryAt,
    lastDisconnectNotifiedAt: row.lastDisconnectNotifiedAt,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
});

export class PrismaBotRepository implements BotRepository {
    async listByOrg(organizationId: string): Promise<Bot[]> {
        const rows = await prisma.bot.findMany({
            where: { organizationId },
            orderBy: { createdAt: "desc" },
        });
        return rows.map(toBot);
    }

    async listAll(): Promise<Bot[]> {
        const rows = await prisma.bot.findMany({
            orderBy: { createdAt: "desc" },
        });
        return rows.map(toBot);
    }

    async findById(id: string): Promise<Bot | null> {
        const row = await prisma.bot.findUnique({ where: { id } });
        return row ? toBot(row) : null;
    }

    async findByIdInOrg(organizationId: string, id: string): Promise<Bot | null> {
        const row = await prisma.bot.findFirst({
            where: { id, organizationId },
        });
        return row ? toBot(row) : null;
    }

    async findByInstanceName(instanceName: string): Promise<Bot | null> {
        const row = await prisma.bot.findUnique({
            where: { evolutionInstanceName: instanceName },
        });
        return row ? toBot(row) : null;
    }

    async create(data: {
        organizationId: string;
        name: string;
        evolutionInstanceName: string;
        phoneNumber?: string;
        webhookUrl?: string;
        flowId?: string | null;
    }): Promise<Bot> {
        const row = await prisma.bot.create({ data });
        return toBot(row);
    }

    async update(
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
            isActive: boolean;
        }>
    ): Promise<Bot> {
        const row = await prisma.bot.update({ where: { id }, data });
        return toBot(row);
    }

    async delete(id: string): Promise<void> {
        await prisma.bot.delete({ where: { id } });
    }
}
