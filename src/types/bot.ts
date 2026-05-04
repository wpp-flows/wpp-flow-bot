export type BotStatus = 'online' | 'offline' | 'connecting' | 'error';

export interface BotInstance {
  id: string;
  name: string;
  phoneNumber?: string;
  status: BotStatus;
  qrCode?: string;
  flowId?: string;
  webhookUrl?: string;
  lastConnectedAt?: string;
  createdAt: string;
  updatedAt: string;
  metrics: {
    conversations: number;
    activeChats: number;
    ordersToday: number;
  };
}

export interface CreateBotPayload {
  name: string;
  phoneNumber?: string;
  webhookUrl?: string;
}

export interface UpdateBotPayload {
  id: string;
  name?: string;
  phoneNumber?: string;
  webhookUrl?: string;
  flowId?: string;
}
