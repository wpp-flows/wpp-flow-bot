import { apiCall } from '@/instances/api';
import type {
  Notification,
  NotificationPage,
  NotificationRecentResponse,
} from '@/types';

export const notificationService = {
  recent(): Promise<NotificationRecentResponse> {
    return apiCall<NotificationRecentResponse>({
      endpoint: '/api/notifications/recent',
    });
  },
  list(params: { cursor?: string; limit?: number } = {}): Promise<NotificationPage> {
    const qs = new URLSearchParams();
    if (params.cursor) qs.set('cursor', params.cursor);
    if (params.limit) qs.set('limit', String(params.limit));
    const search = qs.toString();
    return apiCall<NotificationPage>({
      endpoint: search ? `/api/notifications?${search}` : '/api/notifications',
    });
  },
  markRead(id: string): Promise<Notification> {
    return apiCall<Notification>({
      endpoint: `/api/notifications/${id}/read`,
      method: 'PATCH',
      body: {},
    });
  },
  markAllRead(): Promise<{ count: number }> {
    return apiCall<{ count: number }>({
      endpoint: '/api/notifications/read-all',
      method: 'PATCH',
      body: {},
    });
  },
  deleteAll(): Promise<{ count: number }> {
    return apiCall<{ count: number }>({
      endpoint: '/api/notifications',
      method: 'DELETE',
    });
  },
};
