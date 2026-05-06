import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
});

export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  bots: {
    all: ['bots'] as const,
    detail: (id: string) => ['bots', id] as const,
  },
  menu: {
    categories: ['menu', 'categories'] as const,
    items: ['menu', 'items'] as const,
  },
  flows: {
    all: ['flows'] as const,
    detail: (id: string) => ['flows', id] as const,
  },
  chats: {
    all: ['chats'] as const,
    detail: (id: string) => ['chats', id] as const,
    messages: (id: string) => ['chats', id, 'messages'] as const,
  },
  dashboard: {
    stats: ['dashboard', 'stats'] as const,
  },
} as const;
