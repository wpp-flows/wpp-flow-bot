import { apiCall } from '@/instances/api';
import type {
  AuthSession,
  LoginCredentials,
  NotificationPreferences,
  Organization,
  SignUpCredentials,
  User,
} from '@/types';

/**
 * Auth service backed by better-auth on the server.
 * Sessions are tracked via cookies; no token is stored locally.
 */
export const authService = {
  async signUp(credentials: SignUpCredentials): Promise<User> {
    return apiCall<User>({
      endpoint: '/api/auth/sign-up/email',
      method: 'POST',
      body: credentials,
    });
  },

  async login(credentials: LoginCredentials): Promise<AuthSession> {
    return apiCall<AuthSession>({
      endpoint: '/api/auth/sign-in/email',
      method: 'POST',
      body: {
        email: credentials.email,
        password: credentials.password,
        rememberMe: credentials.remember,
      },
    });
  },

  async logout(): Promise<void> {
    await apiCall({ endpoint: '/api/auth/sign-out', method: 'POST' });
  },

  async me(): Promise<AuthSession | null> {
    return apiCall<AuthSession | null>({
      endpoint: '/api/me',
      allow401AsNull: true,
    });
  },

  async getOrganization(): Promise<Organization | null> {
    try {
      return await apiCall<Organization>({ endpoint: '/api/organization' });
    } catch {
      return null;
    }
  },

  async createOrganization(payload: { name: string; slug?: string }): Promise<Organization> {
    return apiCall<Organization>({
      endpoint: '/api/organization',
      method: 'POST',
      body: payload,
    });
  },

  async updateOrganization(payload: {
    name?: string;
    slug?: string;
    mercadoPagoAccessToken?: string | null;
    mercadoPagoPublicKey?: string | null;
    mercadoPagoWebhookSecret?: string | null;
    payoutPixKey?: string | null;
    payoutPixKeyType?: Organization['payoutPixKeyType'];
    notificationPreferences?: NotificationPreferences;
    paymentTimeoutMinutes?: number;
    paymentCancelMessage?: string | null;
    paymentTimeoutMessage?: string | null;
    paymentReceivedMessage?: string | null;
    deliveryFee?: number;
    workingDaysOfWeek?: number[];
    workingStartTime?: string | null;
    workingEndTime?: string | null;
    outOfHoursMessage?: string | null;
    localWorkingDaysOfWeek?: number[];
    localWorkingStartTime?: string | null;
    localWorkingEndTime?: string | null;
    localOutOfHoursMessage?: string | null;
    botCooldownMinutes?: number;
  }): Promise<Organization> {
    return apiCall<Organization>({
      endpoint: '/api/organization',
      method: 'PATCH',
      body: payload,
    });
  },

  async updateUser(payload: { name?: string; image?: string }): Promise<User> {
    return apiCall<User>({
      endpoint: '/api/auth/update-user',
      method: 'POST',
      body: payload,
    });
  },
};
