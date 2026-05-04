export type ConversationStatus = 'open' | 'closed' | 'pending';

export type MessageAuthor = 'bot' | 'user' | 'system';

export interface Message {
  id: string;
  conversationId: string;
  author: MessageAuthor;
  content: string;
  createdAt: string;
  status?: 'sent' | 'delivered' | 'read';
}

export interface Conversation {
  id: string;
  contactName: string;
  contactPhone: string;
  contactAvatar?: string;
  status: ConversationStatus;
  unreadCount: number;
  lastMessagePreview: string;
  lastMessageAt: string;
  channel: 'whatsapp';
  tags?: string[];
  botInstanceId: string;
  createdAt: string;
}

export interface ConversationFilters {
  search?: string;
  status?: ConversationStatus | 'all';
  fromDate?: string;
  toDate?: string;
}
