import { STORAGE_KEYS } from '@/constants/app';
import { apiCall, ApiError } from '@/instances/api';
import { storage } from '@/instances/storage';
import { generateId } from '@/lib/utils';
import type { BotInstance, CreateBotPayload, UpdateBotPayload } from '@/types';
import { mockBots } from './_mockData';

const seed = () => {
  const stored = storage.get<BotInstance[] | null>(STORAGE_KEYS.bots, null);
  if (stored && Array.isArray(stored) && stored.length) return stored;
  storage.set(STORAGE_KEYS.bots, mockBots);
  return mockBots;
};

const persist = (bots: BotInstance[]) => storage.set(STORAGE_KEYS.bots, bots);

export const botService = {
  async list(): Promise<BotInstance[]> {
    return apiCall({ endpoint: '/bots' }, () => seed());
  },

  async getById(id: string): Promise<BotInstance> {
    return apiCall({ endpoint: `/bots/${id}` }, () => {
      const found = seed().find((b) => b.id === id);
      if (!found) throw new ApiError('Bot not found', 404, `/bots/${id}`);
      return found;
    });
  },

  async create(payload: CreateBotPayload): Promise<BotInstance> {
    return apiCall({ endpoint: '/bots', method: 'POST', body: payload }, () => {
      const bots = seed();
      const now = new Date().toISOString();
      const bot: BotInstance = {
        id: generateId('bot'),
        name: payload.name,
        phoneNumber: payload.phoneNumber,
        webhookUrl: payload.webhookUrl,
        status: 'connecting',
        qrCode: 'PLACEHOLDER_QR_PAYLOAD',
        createdAt: now,
        updatedAt: now,
        metrics: { conversations: 0, activeChats: 0, ordersToday: 0 },
      };
      const next = [bot, ...bots];
      persist(next);
      return bot;
    });
  },

  async update(payload: UpdateBotPayload): Promise<BotInstance> {
    return apiCall({ endpoint: `/bots/${payload.id}`, method: 'PATCH', body: payload }, () => {
      const bots = seed();
      const idx = bots.findIndex((b) => b.id === payload.id);
      if (idx < 0) throw new ApiError('Bot not found', 404, `/bots/${payload.id}`);
      const next: BotInstance = {
        ...bots[idx],
        ...payload,
        updatedAt: new Date().toISOString(),
      };
      const list = [...bots];
      list[idx] = next;
      persist(list);
      return next;
    });
  },

  async remove(id: string): Promise<void> {
    return apiCall({ endpoint: `/bots/${id}`, method: 'DELETE' }, () => {
      const bots = seed();
      persist(bots.filter((b) => b.id !== id));
    });
  },

  async connect(id: string): Promise<BotInstance> {
    return apiCall(
      { endpoint: `/bots/${id}/connect`, method: 'POST', delay: 800 },
      () => {
        const bots = seed();
        const idx = bots.findIndex((b) => b.id === id);
        if (idx < 0) throw new ApiError('Bot not found', 404, `/bots/${id}/connect`);
        const next: BotInstance = {
          ...bots[idx],
          status: 'online',
          lastConnectedAt: new Date().toISOString(),
          qrCode: undefined,
          updatedAt: new Date().toISOString(),
        };
        const list = [...bots];
        list[idx] = next;
        persist(list);
        return next;
      },
    );
  },

  async disconnect(id: string): Promise<BotInstance> {
    return apiCall(
      { endpoint: `/bots/${id}/disconnect`, method: 'POST' },
      () => {
        const bots = seed();
        const idx = bots.findIndex((b) => b.id === id);
        if (idx < 0) throw new ApiError('Bot not found', 404, `/bots/${id}/disconnect`);
        const next: BotInstance = {
          ...bots[idx],
          status: 'offline',
          qrCode: 'PLACEHOLDER_QR_PAYLOAD',
          updatedAt: new Date().toISOString(),
        };
        const list = [...bots];
        list[idx] = next;
        persist(list);
        return next;
      },
    );
  },
};
