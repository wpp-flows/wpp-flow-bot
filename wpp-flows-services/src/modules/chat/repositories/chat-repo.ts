export type ConversationStatus = "OPEN" | "CLOSED" | "PENDING";
export type MessageAuthor = "BOT" | "USER" | "AGENT" | "SYSTEM";
export type MessageStatus = "SENT" | "DELIVERED" | "READ" | "FAILED";

export type FlowPhase = "CATEGORY" | "PRODUCT" | "CONFIRMATION" | "DONE";

export interface FlowCartItem {
    itemId: string;
    name: string;
    price: string;
    qty: number;
}

export interface FlowState {
    phase: FlowPhase;
    selectedCategoryId?: string | null;
    cart: FlowCartItem[];
    lastOptionMap?: Record<string, string>;
}

export interface Conversation {
    id: string;
    organizationId: string;
    botId: string;
    remoteJid: string;
    contactName: string;
    contactPhone: string;
    contactAvatar: string | null;
    status: ConversationStatus;
    unreadCount: number;
    lastMessagePreview: string;
    lastMessageAt: Date;
    botActive: boolean;
    currentStepId: string | null;
    flowState: FlowState | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface Message {
    id: string;
    conversationId: string;
    evolutionMessageId: string | null;
    author: MessageAuthor;
    content: string;
    status: MessageStatus;
    createdAt: Date;
}

export interface ConversationFilters {
    status?: ConversationStatus;
    search?: string;
    botId?: string;
    fromDate?: Date;
    toDate?: Date;
}

export interface ConversationRepository {
    listByOrg(
        organizationId: string,
        filters: ConversationFilters
    ): Promise<Conversation[]>;
    findByIdInOrg(
        organizationId: string,
        id: string
    ): Promise<Conversation | null>;
    findByBotAndRemoteJid(
        botId: string,
        remoteJid: string
    ): Promise<Conversation | null>;
    create(data: {
        organizationId: string;
        botId: string;
        remoteJid: string;
        contactName: string;
        contactPhone: string;
        contactAvatar?: string;
        lastMessagePreview?: string;
        lastMessageAt?: Date;
    }): Promise<Conversation>;
    update(
        id: string,
        data: Partial<{
            status: ConversationStatus;
            unreadCount: number;
            lastMessagePreview: string;
            lastMessageAt: Date;
            botActive: boolean;
            currentStepId: string | null;
            flowState: FlowState | null;
            contactName: string;
            contactAvatar: string | null;
        }>
    ): Promise<Conversation>;
}

export interface MessageRepository {
    listByConversation(
        conversationId: string,
        params?: { limit?: number; before?: Date }
    ): Promise<Message[]>;
    create(data: {
        conversationId: string;
        evolutionMessageId?: string;
        author: MessageAuthor;
        content: string;
        status?: MessageStatus;
    }): Promise<Message>;
    findByEvolutionId(evolutionMessageId: string): Promise<Message | null>;
    updateStatus(
        evolutionMessageId: string,
        status: MessageStatus
    ): Promise<Message | null>;
}
