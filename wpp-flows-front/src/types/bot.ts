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
  /** days (0=Sunday..6=Saturday) the bot replies. empty = every day. */
  workingDaysOfWeek: number[];
  /** "HH:MM" 24h. Null = no time restriction. */
  workingStartTime: string | null;
  workingEndTime: string | null;
  /** custom out-of-hours reply; null/blank uses an auto-built default. */
  outOfHoursMessage: string | null;
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
  workingDaysOfWeek?: number[];
  workingStartTime?: string | null;
  workingEndTime?: string | null;
  outOfHoursMessage?: string | null;
}
