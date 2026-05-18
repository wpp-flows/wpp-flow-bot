export type OrderStatus =
  | 'RECEIVED'
  | 'PREPARING'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELED';

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

export interface OrderItem {
  itemId: string;
  name: string;
  price: string;
  qty: number;
}

export interface Order {
  id: string;
  organizationId: string;
  customerId: string;
  conversationId: string | null;
  sequence: number;
  items: OrderItem[];
  subtotal: string;
  discount: string | null;
  total: string;
  status: OrderStatus;
  observation: string | null;
  address: string | null;
  paymentStatus: PaymentStatus;
  paymentProvider: string | null;
  paymentProviderRef: string | null;
  receiptUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrderFilters {
  status?: OrderStatus;
  customerId?: string;
  fromDate?: string;
  toDate?: string;
}
