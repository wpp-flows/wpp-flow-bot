export type BotStatus = 'ONLINE' | 'OFFLINE' | 'CONNECTING' | 'ERROR';
export type BotProvider = 'EVOLUTION' | 'CLOUD_API';

export interface BotInstance {
  id: string;
  organizationId: string;
  name: string;
  provider: BotProvider;
  evolutionInstanceName?: string | null;
  phoneNumber?: string | null;
  status: BotStatus;
  isActive: boolean;
  qrCode?: string | null;
  flowId?: string | null;
  webhookUrl?: string | null;
  wabaId?: string | null;
  phoneNumberId?: string | null;
  displayPhoneNumber?: string | null;
  verifiedName?: string | null;
  tokenStatus?: string | null;
  lastConnectedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EmbeddedSignupConfig {
  appId: string | null;
  configId: string | null;
  graphVersion: string;
  configured: boolean;
}

export interface EmbeddedSignupPayload {
  name?: string;
  code: string;
  wabaId: string;
  phoneNumberId: string;
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
