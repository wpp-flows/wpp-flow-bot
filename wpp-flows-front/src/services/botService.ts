import { apiCall } from '@/instances/api';
import type {
  BotInstance,
  EmbeddedSignupConfig,
  EmbeddedSignupPayload,
  UpdateBotPayload,
} from '@/types';

export const botService = {
  list(): Promise<BotInstance[]> {
    return apiCall<BotInstance[]>({ endpoint: '/api/bots' });
  },

  getById(id: string): Promise<BotInstance> {
    return apiCall<BotInstance>({ endpoint: `/api/bots/${id}` });
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

  embeddedSignupConfig(): Promise<EmbeddedSignupConfig> {
    return apiCall<EmbeddedSignupConfig>({
      endpoint: '/api/bots/embedded-signup/config',
    });
  },

  embeddedSignup(payload: EmbeddedSignupPayload): Promise<BotInstance> {
    return apiCall<BotInstance>({
      endpoint: '/api/bots/embedded-signup',
      method: 'POST',
      body: payload,
    });
  },

  setIsActive(id: string, isActive: boolean): Promise<BotInstance> {
    return apiCall<BotInstance>({
      endpoint: `/api/bots/${id}/is-active`,
      method: 'PATCH',
      body: { isActive },
    });
  },

  sendTestMessage(
    id: string,
    to: string,
    text?: string,
  ): Promise<{ messageId: string }> {
    return apiCall<{ messageId: string }>({
      endpoint: `/api/bots/${id}/test-message`,
      method: 'POST',
      body: { to, text },
    });
  },
};
