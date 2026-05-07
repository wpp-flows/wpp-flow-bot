import type { DashboardStats } from '@/types';
import { botService } from './botService';
import { chatService } from './chatService';

/**
 * Dashboard service. The backend doesn't yet expose an aggregated dashboard
 * endpoint — derive stats from existing endpoints client-side until one ships.
 */
export const dashboardService = {
  async getStats(): Promise<DashboardStats> {
    const [bots, conversations] = await Promise.all([
      botService.list().catch(() => []),
      chatService.list({}).catch(() => []),
    ]);

    const activeChats = conversations.filter((c) => c.status === 'OPEN').length;
    const totalConversations = conversations.length;

    return {
      totalConversations,
      activeChats,
      ordersToday: 0,
      ordersTodayDelta: 0,
      conversationsDelta: 0,
      averageResponseSeconds: 0,
      conversationsByDay: [],
      recentActivity: bots.slice(0, 5).map((b, i) => ({
        id: `bot_${b.id}_${i}`,
        kind: b.status === 'ONLINE' ? 'connect' : 'disconnect',
        message: `${b.name} is ${b.status.toLowerCase()}`,
        createdAt: b.updatedAt,
      })),
    };
  },
};
