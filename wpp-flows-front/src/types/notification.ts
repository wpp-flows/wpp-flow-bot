export type NotificationType =
  | 'NEW_ORDER'
  | 'PAYMENT_RECEIVED'
  | 'BOT_OFFLINE'
  | 'IDLE_CONVERSATION'
  | 'GENERIC';

export interface Notification {
  id: string;
  organizationId: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationRecentResponse {
  items: Notification[];
  unread: number;
}

export interface NotificationPage {
  items: Notification[];
  nextCursor: string | null;
}
