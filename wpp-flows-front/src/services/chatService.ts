import { apiCall } from '@/instances/api';
import type { Conversation, ConversationFilters, Message } from '@/types';

export const chatService = {
  list(filters: ConversationFilters = {}): Promise<Conversation[]> {
    return apiCall<Conversation[]>({
      endpoint: '/api/chats',
      query: {
        search: filters.search,
        status: filters.status,
        botId: filters.botId,
        fromDate: filters.fromDate,
        toDate: filters.toDate,
      },
    });
  },

  getById(id: string): Promise<Conversation> {
    return apiCall<Conversation>({ endpoint: `/api/chats/${id}` });
  },

  listMessages(conversationId: string, limit?: number): Promise<Message[]> {
    return apiCall<Message[]>({
      endpoint: `/api/chats/${conversationId}/messages`,
      query: { limit },
    });
  },

  sendMessage(conversationId: string, content: string): Promise<Message> {
    return apiCall<Message>({
      endpoint: `/api/chats/${conversationId}/messages`,
      method: 'POST',
      body: { content },
    });
  },

  updateStatus(id: string, status: Conversation['status']): Promise<Conversation> {
    return apiCall<Conversation>({
      endpoint: `/api/chats/${id}/status`,
      method: 'PATCH',
      body: { status },
    });
  },

  setBotActive(id: string, botActive: boolean): Promise<Conversation> {
    return apiCall<Conversation>({
      endpoint: `/api/chats/${id}/bot-active`,
      method: 'PATCH',
      body: { botActive },
    });
  },

  markConversationRead(id: string): Promise<Conversation> {
    return apiCall<Conversation>({
      endpoint: `/api/chats/${id}/read`,
      method: 'PATCH',
    });
  },
};
