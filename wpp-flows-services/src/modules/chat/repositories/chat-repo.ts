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
    /**
     * Free-text answers captured by INPUT steps, keyed by metadata.fieldKey
     * (e.g. "observation", "address"). Exposed to subsequent steps as
     * `{{input.<key>}}` template variables.
     */
    inputs?: Record<string, string>;
    /**
     * Id of an INPUT step that is currently waiting for the customer's typed
     * reply. While set, the runner treats the next inbound text as the answer
     * regardless of any list/button selection id attached to it.
     */
    awaitingInputForStepId?: string | null;
    /**
     * Id of the most recently created Order for this conversation, set when a
     * CONFIRMATION step finalizes. Available in subsequent steps so they can
     * reference the order (e.g. "Pedido #{{order_number}}").
     */
    orderId?: string | null;
    /**
     * Order id we are currently waiting on a Mercado Pago webhook to clear. While
     * set, the runner treats inbound text/selections as "still waiting" and
     * re-sends the payment link instead of advancing the flow.
     */
    awaitingPaymentForOrderId?: string | null;
}

export interface Conversation {
    id: string;
    organizationId: string;
    botId: string;
    customerId: string | null;
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
            customerId: string | null;
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
