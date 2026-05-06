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
