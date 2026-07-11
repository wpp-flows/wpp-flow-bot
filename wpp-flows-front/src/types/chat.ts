export type ConversationStatus = 'OPEN' | 'CLOSED' | 'PENDING';

export type MessageAuthor = 'BOT' | 'USER' | 'AGENT' | 'SYSTEM';

export type MessageStatus = 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';

export interface Message {
  id: string;
  conversationId: string;
  evolutionMessageId?: string | null;
  author: MessageAuthor;
  content: string;
  status: MessageStatus;
  createdAt: string;
}

export interface Conversation {
  id: string;
  organizationId: string;
  botId: string;
  remoteJid: string;
  contactName: string;
  contactPhone: string;
  contactAvatar?: string | null;
  status: ConversationStatus;
  unreadCount: number;
  lastMessagePreview: string;
  lastMessageAt: string;
  botActive: boolean;
  lastInboundAt?: string | null;
  currentStepId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationFilters {
  search?: string;
  status?: ConversationStatus;
  botId?: string;
  fromDate?: string;
  toDate?: string;
}
