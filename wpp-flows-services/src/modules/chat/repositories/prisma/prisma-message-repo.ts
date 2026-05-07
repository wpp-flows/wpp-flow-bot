import { prisma } from "@/infrastructure/database/client";
import type {
    Message,
    MessageAuthor,
    MessageRepository,
    MessageStatus,
} from "../chat-repo";

const toMessage = (row: any): Message => ({
    id: row.id,
    conversationId: row.conversationId,
    evolutionMessageId: row.evolutionMessageId,
    author: row.author as MessageAuthor,
    content: row.content,
    status: row.status as MessageStatus,
    createdAt: row.createdAt,
});

export class PrismaMessageRepository implements MessageRepository {
    async listByConversation(
        conversationId: string,
        params: { limit?: number; before?: Date } = {}
    ): Promise<Message[]> {
        const rows = await prisma.message.findMany({
            where: {
                conversationId,
                ...(params.before ? { createdAt: { lt: params.before } } : {}),
            },
            orderBy: { createdAt: "asc" },
            take: params.limit,
        });
        return rows.map(toMessage);
    }

    async create(data: {
        conversationId: string;
        evolutionMessageId?: string;
        author: MessageAuthor;
        content: string;
        status?: MessageStatus;
    }): Promise<Message> {
        const row = await prisma.message.create({
            data: {
                ...data,
                status: data.status ?? "SENT",
            },
        });
        return toMessage(row);
    }

    async findByEvolutionId(evolutionMessageId: string): Promise<Message | null> {
        const row = await prisma.message.findUnique({
            where: { evolutionMessageId },
        });
        return row ? toMessage(row) : null;
    }

    async updateStatus(
        evolutionMessageId: string,
        status: MessageStatus
    ): Promise<Message | null> {
        const row = await prisma.message.update({
            where: { evolutionMessageId },
            data: { status },
        });
        return row ? toMessage(row) : null;
    }
}
