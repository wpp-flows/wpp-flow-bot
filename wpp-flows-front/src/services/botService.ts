import { apiCall } from '@/instances/api';
import type { BotInstance, CreateBotPayload, UpdateBotPayload } from '@/types';

export const botService = {
  list(): Promise<BotInstance[]> {
    return apiCall<BotInstance[]>({ endpoint: '/api/bots' });
  },

  getById(id: string): Promise<BotInstance> {
    return apiCall<BotInstance>({ endpoint: `/api/bots/${id}` });
  },

  create(payload: CreateBotPayload): Promise<BotInstance> {
    return apiCall<BotInstance>({
      endpoint: '/api/bots',
      method: 'POST',
      body: payload,
    });
  },

  update(payload: UpdateBotPayload): Promise<BotInstance> {
    const { id, ...rest } = payload;
    return apiCall<BotInstance>({
      endpoint: `/api/bots/${id}`,
      method: 'PATCH',
      body: rest,
    });
  },

  remove(id: string): Promise<void> {
    return apiCall<void>({ endpoint: `/api/bots/${id}`, method: 'DELETE' });
  },

  connect(id: string): Promise<BotInstance> {
    return apiCall<BotInstance>({
      endpoint: `/api/bots/${id}/connect`,
      method: 'POST',
    });
  },

  disconnect(id: string): Promise<BotInstance> {
    return apiCall<BotInstance>({
      endpoint: `/api/bots/${id}/disconnect`,
      method: 'POST',
    });
  },

  getConnectionState(id: string): Promise<{ bot: BotInstance; evolutionState: string | null }> {
    return apiCall({ endpoint: `/api/bots/${id}/state` });
  },

  setIsActive(id: string, isActive: boolean): Promise<BotInstance> {
    return apiCall<BotInstance>({
      endpoint: `/api/bots/${id}/is-active`,
      method: 'PATCH',
      body: { isActive },
    });
  },
};
