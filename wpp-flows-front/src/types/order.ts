export type OrderStatus =
  | 'RECEIVED'
  | 'PREPARING'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELED';

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

export type ServiceType = 'DELIVERY' | 'LOCAL';

export type DeliveryMode = 'PICKUP' | 'DELIVERY';

export type PaymentProvider = 'MERCADO_PAGO' | 'CASH' | 'DELIVERY_CARD_PIX';

export interface OrderItemAdditional {
  id: string;
  name: string;
  price: string;
}

export interface OrderItem {
  itemId: string;
  name: string;
  price: string;
  qty: number;
  notes?: string | null;
  additionals?: OrderItemAdditional[];
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
  deliveryMode: DeliveryMode;
  deliveryFee: string;
  couponCode: string | null;
  couponDiscount: string | null;
  paymentStatus: PaymentStatus;
  paymentProvider: PaymentProvider | null;
  paymentProviderRef: string | null;
  paymentLink: string | null;
  receiptUrl: string | null;
  cashChangeFor: string | null;
  serviceType: ServiceType;
  tableId: string | null;
  tableLabel: string | null;
  billId: string | null;
  customerName: string | null;
  appliedPromotionIds: string[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrderFilters {
  status?: OrderStatus;
  customerId?: string;
  fromDate?: string;
  toDate?: string;
  date?: string;
  serviceType?: ServiceType;
  tableId?: string;
  unbilledOnly?: boolean;
}
