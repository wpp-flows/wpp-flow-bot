import {
  QueryClient,
  type InvalidateQueryFilters,
  type Query,
} from '@tanstack/react-query';

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

export function isChatConversationListQuery(query: Query): boolean {
  const key = query.queryKey;
  if (!Array.isArray(key) || key[0] !== 'chats') return false;
  if (key.length >= 3 && key[2] === 'messages') return false;
  return true;
}

export function invalidateQueriesByFilters(
  client: QueryClient,
  filters: ReadonlyArray<InvalidateQueryFilters> = [{}],
) {
  return Promise.all(filters.map((filter) => client.invalidateQueries(filter)));
}
