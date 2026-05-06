import { STORAGE_KEYS } from '@/constants/app';
import { apiCall, ApiError } from '@/instances/api';
import { storage } from '@/instances/storage';
import { generateId } from '@/lib/utils';
import type { Conversation, ConversationFilters, Message } from '@/types';
import { mockConversations, mockMessages } from './_mockData';

interface ChatState {
  conversations: Conversation[];
  messagesByConversation: Record<string, Message[]>;
}

const seed = (): ChatState => {
  const stored = storage.get<ChatState | null>(STORAGE_KEYS.chats, null);
  if (stored && stored.conversations?.length) return stored;
  const fresh: ChatState = {
    conversations: mockConversations,
    messagesByConversation: mockMessages,
  };
  storage.set(STORAGE_KEYS.chats, fresh);
  return fresh;
};

const persist = (state: ChatState) => storage.set(STORAGE_KEYS.chats, state);

export const chatService = {
  async list(filters: ConversationFilters = {}): Promise<Conversation[]> {
    return apiCall(
      { endpoint: '/chats', body: filters as unknown },
      () => {
        const state = seed();
        const search = (filters.search ?? '').trim().toLowerCase();
        return state.conversations
          .filter((c) => {
            if (filters.status && filters.status !== 'all' && c.status !== filters.status) {
              return false;
            }
            if (search) {
              const hay = `${c.contactName} ${c.contactPhone} ${c.lastMessagePreview}`.toLowerCase();
              if (!hay.includes(search)) return false;
            }
            if (filters.fromDate && new Date(c.lastMessageAt) < new Date(filters.fromDate)) {
              return false;
            }
            if (filters.toDate && new Date(c.lastMessageAt) > new Date(filters.toDate)) {
              return false;
            }
            return true;
          })
          .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
      },
    );
  },

  async getById(id: string): Promise<Conversation> {
    return apiCall({ endpoint: `/chats/${id}` }, () => {
      const found = seed().conversations.find((c) => c.id === id);
      if (!found) throw new ApiError('Conversation not found', 404, `/chats/${id}`);
      return found;
    });
  },

  async listMessages(conversationId: string): Promise<Message[]> {
    return apiCall({ endpoint: `/chats/${conversationId}/messages`, delay: 250 }, () => {
      const state = seed();
      return state.messagesByConversation[conversationId] ?? [];
    });
  },

  async sendMessage(conversationId: string, content: string): Promise<Message> {
    return apiCall(
      { endpoint: `/chats/${conversationId}/messages`, method: 'POST', body: { content }, delay: 200 },
      () => {
        const state = seed();
        const message: Message = {
          id: generateId('msg'),
          conversationId,
          author: 'bot',
          content,
          createdAt: new Date().toISOString(),
          status: 'sent',
        };
        const messages = [...(state.messagesByConversation[conversationId] ?? []), message];
        const conversations = state.conversations.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                lastMessagePreview: content.slice(0, 100),
                lastMessageAt: message.createdAt,
                unreadCount: 0,
              }
            : c,
        );
        persist({
          conversations,
          messagesByConversation: { ...state.messagesByConversation, [conversationId]: messages },
        });
        return message;
      },
    );
  },

  async updateStatus(
    id: string,
    status: Conversation['status'],
  ): Promise<Conversation> {
    return apiCall(
      { endpoint: `/chats/${id}/status`, method: 'PATCH', body: { status } },
      () => {
        const state = seed();
        const idx = state.conversations.findIndex((c) => c.id === id);
        if (idx < 0) throw new ApiError('Conversation not found', 404, `/chats/${id}/status`);
        const next: Conversation = { ...state.conversations[idx], status };
        const conversations = [...state.conversations];
        conversations[idx] = next;
        persist({ ...state, conversations });
        return next;
      },
    );
  },
};
