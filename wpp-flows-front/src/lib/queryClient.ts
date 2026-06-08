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
    overview: ['dashboard', 'overview'] as const,
  },
  orders: {
    all: ['orders'] as const,
    today: ['orders', 'today'] as const,
    detail: (id: string) => ['orders', id] as const,
  },
  reports: {
    daily: ['reports', 'daily'] as const,
    dailyDetail: (date: string) => ['reports', 'daily', date] as const,
    dailyByService: (serviceType: 'DELIVERY' | 'LOCAL') =>
      ['reports', 'daily', 'service', serviceType] as const,
  },
  localTables: {
    all: ['local', 'tables'] as const,
    detail: (id: string) => ['local', 'tables', id] as const,
  },
  localBills: {
    all: ['local', 'bills'] as const,
  },
  localOrders: {
    all: ['local', 'orders'] as const,
    byTable: (tableId: string) => ['local', 'orders', 'table', tableId] as const,
  },
  localWallet: {
    summary: ['local', 'wallet'] as const,
    transactions: ['local', 'wallet', 'transactions'] as const,
  },
  wallet: {
    me: ['wallet'] as const,
    transactions: ['wallet', 'transactions'] as const,
  },
  promotions: {
    all: ['promotions'] as const,
  },
  coupons: {
    all: ['coupons'] as const,
  },
  publicMenu: {
    detail: (slug: string) => ['public-menu', slug] as const,
  },
  templateVariables: {
    all: ['template-variables'] as const,
  },
  notifications: {
    recent: ['notifications', 'recent'] as const,
    list: ['notifications', 'list'] as const,
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
