export interface User {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  isAdmin?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InvitationTokenInfo {
  valid: boolean;
  email: string | null;
  expiresAt: string | null;
}

export interface AcceptInvitationPayload {
  token: string;
  name: string;
  password: string;
}

export interface Invitation {
  id: string;
  email: string;
  token: string;
  status: 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED';
  expiresAt: string;
  acceptedAt: string | null;
  invitedById: string;
  invitedByName: string | null;
  createdAt: string;
  updatedAt: string;
}

export type PayoutPixKeyType = 'cpf' | 'cnpj' | 'email' | 'phone' | 'random';

export interface NotificationPreferences {
  newOrders: boolean;
  botDisconnects: boolean;
  idleConversations: boolean;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  mercadoPagoAccessToken: string | null;
  mercadoPagoPublicKey: string | null;
  mercadoPagoWebhookSecret: string | null;
  payoutPixKey: string | null;
  payoutPixKeyType: PayoutPixKeyType | null;
  notificationPreferences: NotificationPreferences;
  paymentTimeoutMinutes: number;
  paymentCancelMessage: string | null;
  paymentTimeoutMessage: string | null;
  paymentReceivedMessage: string | null;
  deliveryFee: string;
  workingDaysOfWeek: number[];
  workingStartTime: string | null;
  workingEndTime: string | null;
  outOfHoursMessage: string | null;
  botCooldownMinutes: number;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  user: User;
  session: { id: string; expiresAt: string };
}

export interface LoginCredentials {
  email: string;
  password: string;
  remember?: boolean;
}

export interface SignUpCredentials {
  email: string;
  password: string;
  name: string;
}
