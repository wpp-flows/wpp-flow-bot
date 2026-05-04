import { apiCall } from '@/instances/api';
import type { DashboardStats } from '@/types';
import { mockBots } from './_mockData';

const isoDaysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
};

export const dashboardService = {
  async getStats(): Promise<DashboardStats> {
    return apiCall({ endpoint: '/dashboard/stats' }, () => {
      const totals = mockBots.reduce(
        (acc, b) => ({
          conversations: acc.conversations + b.metrics.conversations,
          activeChats: acc.activeChats + b.metrics.activeChats,
          ordersToday: acc.ordersToday + b.metrics.ordersToday,
        }),
        { conversations: 0, activeChats: 0, ordersToday: 0 },
      );

      const conversationsByDay = Array.from({ length: 14 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (13 - i));
        return {
          date: d.toISOString().slice(0, 10),
          count: 80 + Math.round(Math.sin(i * 0.6) * 30 + Math.random() * 40),
        };
      });

      return {
        totalConversations: totals.conversations,
        activeChats: totals.activeChats,
        ordersToday: totals.ordersToday,
        ordersTodayDelta: 12.4,
        conversationsDelta: 5.8,
        averageResponseSeconds: 38,
        conversationsByDay,
        recentActivity: [
          { id: 'act_1', kind: 'order', message: 'New order from Lucia Rinaldi · $42.50', createdAt: isoDaysAgo(0) },
          { id: 'act_2', kind: 'connect', message: 'Bellini Main reconnected to WhatsApp', createdAt: isoDaysAgo(0) },
          { id: 'act_3', kind: 'message', message: 'Thomas Becker confirmed an order', createdAt: isoDaysAgo(0) },
          { id: 'act_4', kind: 'disconnect', message: 'Private Events went offline', createdAt: isoDaysAgo(1) },
          { id: 'act_5', kind: 'order', message: 'New order from Kenji Watanabe · $17.00', createdAt: isoDaysAgo(1) },
        ],
      };
    });
  },
};
