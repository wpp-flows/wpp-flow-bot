export interface DashboardStats {
  totalConversations: number;
  activeChats: number;
  ordersToday: number;
  ordersTodayDelta: number;
  conversationsDelta: number;
  averageResponseSeconds: number;
  recentActivity: ActivityEvent[];
  conversationsByDay: { date: string; count: number }[];
}

export interface ActivityEvent {
  id: string;
  kind: 'order' | 'connect' | 'disconnect' | 'message';
  message: string;
  createdAt: string;
}

export type DashboardOrderStatus =
  | 'RECEIVED'
  | 'PREPARING'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELED';

export interface DashboardOrdersByDay {
  date: string;
  orders: number;
  revenue: string;
}

export interface DashboardStatusBucket {
  status: DashboardOrderStatus;
  count: number;
}

export interface DashboardTopItem {
  itemId: string;
  name: string;
  qty: number;
}

export interface DashboardOverview {
  todayOrders: number;
  todayRevenue: string;
  weekRevenue: string;
  prevWeekRevenue: string;
  activeConversations: number;
  newCustomersThisMonth: number;
  onlineBots: number;
  totalBots: number;
  ordersByDay: DashboardOrdersByDay[];
  statusBreakdown: DashboardStatusBucket[];
  topItems: DashboardTopItem[];
}
