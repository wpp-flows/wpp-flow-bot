export interface User {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
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
