import { STORAGE_KEYS } from '@/constants/app';
import { apiCall, ApiError } from '@/instances/api';
import { storage } from '@/instances/storage';
import { generateId } from '@/lib/utils';
import type { AuthSession, LoginCredentials, User } from '@/types';
import { mockUser } from './_mockData';

/**
 * Auth service — placeholder. Replace `apiCall` resolvers with real
 * Evolution API / auth backend requests when available.
 */
export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthSession> {
    return apiCall(
      { endpoint: '/auth/login', method: 'POST', body: credentials },
      () => {
        if (!credentials.email || !credentials.password) {
          throw new ApiError('Missing credentials', 400, '/auth/login');
        }
        // Demo: any email + password ≥ 8 chars succeeds
        const session: AuthSession = {
          user: { ...mockUser, email: credentials.email },
          token: `mock_${generateId('tok')}`,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        };
        storage.set(STORAGE_KEYS.authToken, session.token);
        storage.set(STORAGE_KEYS.authUser, session.user);
        return session;
      },
    );
  },

  async logout(): Promise<void> {
    return apiCall({ endpoint: '/auth/logout', method: 'POST', delay: 200 }, () => {
      storage.remove(STORAGE_KEYS.authToken);
      storage.remove(STORAGE_KEYS.authUser);
    });
  },

  async me(): Promise<User | null> {
    return apiCall({ endpoint: '/auth/me', delay: 200 }, () => {
      const token = storage.get<string | null>(STORAGE_KEYS.authToken, null);
      const user = storage.get<User | null>(STORAGE_KEYS.authUser, null);
      if (!token || !user) return null;
      return user;
    });
  },

  getStoredSession(): { token: string | null; user: User | null } {
    return {
      token: storage.get<string | null>(STORAGE_KEYS.authToken, null),
      user: storage.get<User | null>(STORAGE_KEYS.authUser, null),
    };
  },
};
