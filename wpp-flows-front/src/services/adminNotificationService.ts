import { apiCall } from '@/instances/api';

export type AdminNotificationType = 'WA_VERSION_UPDATED';

export interface AdminNotification {
  id: string;
  type: AdminNotificationType;
  title: string;
  body: string;
  metadata: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}

export interface AdminNotificationsResponse {
  items: AdminNotification[];
  unread: number;
}

export const adminNotificationService = {
  list(): Promise<AdminNotificationsResponse> {
    return apiCall<AdminNotificationsResponse>({
      endpoint: '/api/admin/notifications',
    });
  },

  markRead(id: string): Promise<AdminNotification> {
    return apiCall<AdminNotification>({
      endpoint: `/api/admin/notifications/${id}/read`,
      method: 'POST',
    });
  },

  markAllRead(): Promise<{ markedCount: number }> {
    return apiCall<{ markedCount: number }>({
      endpoint: '/api/admin/notifications/read-all',
      method: 'POST',
    });
  },
};
