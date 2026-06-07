export type TableStatus = "EMPTY" | "OCCUPIED" | "BILL_REQUESTED";

export interface RestaurantTable {
  id: string;
  organizationId: string;
  label: string;
  qrToken: string;
  position: number;
  seats: number | null;
  notes: string | null;
  status: TableStatus;
  billRequestedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type LocalPaymentMethod = "CASH" | "CARD" | "PIX" | "OTHER";

export interface TableBill {
  id: string;
  organizationId: string;
  tableId: string;
  total: string;
  paymentMethod: LocalPaymentMethod;
  notes: string | null;
  closedAt: string;
  closedById: string;
  createdAt: string;
}

export interface PublicTableResolved {
  tableId: string;
  tableLabel: string;
  tableStatus: TableStatus;
  billRequested: boolean;
  slug: string;
  organizationName: string;
}

export interface PublicTableOrder {
  id: string;
  sequence: number;
  status:
    | "RECEIVED"
    | "PREPARING"
    | "OUT_FOR_DELIVERY"
    | "DELIVERED"
    | "CANCELED";
  customerName: string | null;
  items: Array<{ name: string; qty: number }>;
  total: string;
  createdAt: string;
}

export interface PublicTableOrdersResponse {
  tableLabel: string;
  orders: PublicTableOrder[];
}
