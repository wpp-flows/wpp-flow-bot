import { prisma } from "@/infrastructure/database/client";
import type {
    Conversation,
    ConversationFilters,
    ConversationRepository,
    ConversationStatus,
    FlowState,
} from "../chat-repo";

const toConversation = (row: any): Conversation => ({
    id: row.id,
    organizationId: row.organizationId,
    botId: row.botId,
    customerId: row.customerId ?? null,
    remoteJid: row.remoteJid,
    contactName: row.contactName,
    contactPhone: row.contactPhone,
    contactAvatar: row.contactAvatar,
    status: row.status as ConversationStatus,
    unreadCount: row.unreadCount,
    lastMessagePreview: row.lastMessagePreview,
    lastMessageAt: row.lastMessageAt,
    botActive: row.botActive,
    currentStepId: row.currentStepId,
    flowState: (row.flowState as FlowState | null) ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
});

export class PrismaConversationRepository implements ConversationRepository {
    async listByOrg(
        organizationId: string,
        filters: ConversationFilters
    ): Promise<Conversation[]> {
        const rows = await prisma.conversation.findMany({
            where: {
                organizationId,
                ...(filters.botId ? { botId: filters.botId } : {}),
                ...(filters.status ? { status: filters.status } : {}),
                ...(filters.search
                    ? {
                        OR: [
                            { contactName: { contains: filters.search, mode: "insensitive" } },
                            { contactPhone: { contains: filters.search, mode: "insensitive" } },
                            {
                                lastMessagePreview: {
                                    contains: filters.search,
                                    mode: "insensitive",
                                },
                            },
                        ],
                    }
                    : {}),
                ...(filters.fromDate || filters.toDate
                    ? {
                        lastMessageAt: {
                            ...(filters.fromDate ? { gte: filters.fromDate } : {}),
                            ...(filters.toDate ? { lte: filters.toDate } : {}),
                        },
                    }
                    : {}),
            },
            orderBy: { lastMessageAt: "desc" },
        });
        return rows.map(toConversation);
    }

    async findByIdInOrg(
        organizationId: string,
        id: string
    ): Promise<Conversation | null> {
        const row = await prisma.conversation.findFirst({
            where: { id, organizationId },
        });
        return row ? toConversation(row) : null;
    }

    async findByBotAndRemoteJid(
        botId: string,
        remoteJid: string
    ): Promise<Conversation | null> {
        const row = await prisma.conversation.findUnique({
            where: { botId_remoteJid: { botId, remoteJid } },
        });
        return row ? toConversation(row) : null;
    }

    async create(data: {
        organizationId: string;
        botId: string;
        remoteJid: string;
        contactName: string;
        contactPhone: string;
        contactAvatar?: string;
        lastMessagePreview?: string;
        lastMessageAt?: Date;
    }): Promise<Conversation> {
        const row = await prisma.conversation.create({
            data: {
                ...data,
                lastMessagePreview: data.lastMessagePreview ?? "",
                lastMessageAt: data.lastMessageAt ?? new Date(),
            },
        });
        return toConversation(row);
    }

    async update(id: string, data: any): Promise<Conversation> {
        const row = await prisma.conversation.update({ where: { id }, data });
        return toConversation(row);
    }
}
