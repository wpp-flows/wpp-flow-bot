import { create } from 'zustand';
import type { User } from '@/types';
import { authService } from '@/services/authService';

interface AuthState {
  user: User | null;
  token: string | null;
  status: 'idle' | 'authenticated' | 'unauthenticated';
  setSession: (user: User | null, token: string | null) => void;
  bootstrap: () => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  status: 'idle',
  setSession: (user, token) =>
    set({
      user,
      token,
      status: user && token ? 'authenticated' : 'unauthenticated',
    }),
  bootstrap: () => {
    const { token, user } = authService.getStoredSession();
    set({
      user,
      token,
      status: user && token ? 'authenticated' : 'unauthenticated',
    });
  },
  signOut: async () => {
    await authService.logout();
    set({ user: null, token: null, status: 'unauthenticated' });
  },
}));
