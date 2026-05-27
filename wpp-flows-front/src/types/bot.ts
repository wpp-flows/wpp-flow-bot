export type BotStatus = 'ONLINE' | 'OFFLINE' | 'CONNECTING' | 'ERROR';

export interface BotInstance {
  id: string;
  organizationId: string;
  name: string;
  evolutionInstanceName: string;
  phoneNumber?: string | null;
  status: BotStatus;
  qrCode?: string | null;
  flowId?: string | null;
  webhookUrl?: string | null;
  lastConnectedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBotPayload {
  name: string;
  phoneNumber?: string;
  webhookUrl?: string;
  flowId?: string;
}

export interface UpdateBotPayload {
  id: string;
  name?: string;
  phoneNumber?: string | null;
  webhookUrl?: string | null;
  flowId?: string | null;
}
