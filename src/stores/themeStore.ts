import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { STORAGE_KEYS } from '@/constants/app';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  resolved: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  setResolved: (theme: 'light' | 'dark') => void;
  toggle: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      resolved: 'light',
      setTheme: (theme) => set({ theme }),
      setResolved: (resolved) => set({ resolved }),
      toggle: () => {
        const next = get().resolved === 'dark' ? 'light' : 'dark';
        set({ theme: next });
      },
    }),
    {
      name: STORAGE_KEYS.theme,
      partialize: (s) => ({ theme: s.theme }),
    },
  ),
);
