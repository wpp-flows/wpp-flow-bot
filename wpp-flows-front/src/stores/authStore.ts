import { create } from 'zustand';
import type { Organization, User } from '@/types';
import { authService } from '@/services/authService';

interface AuthState {
  user: User | null;
  organization: Organization | null;
  status: 'idle' | 'authenticated' | 'unauthenticated';
  bootstrap: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshOrganization: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  organization: null,
  status: 'idle',
  bootstrap: async () => {
    const session = await authService.me();
    if (!session) {
      set({ user: null, organization: null, status: 'unauthenticated' });
      return;
    }
    const organization = await authService.getOrganization();
    set({
      user: session.user,
      organization,
      status: 'authenticated',
    });
  },
  signOut: async () => {
    await authService.logout();
    set({ user: null, organization: null, status: 'unauthenticated' });
  },
  refreshOrganization: async () => {
    if (get().status !== 'authenticated') return;
    const organization = await authService.getOrganization();
    set({ organization });
  },
}));
