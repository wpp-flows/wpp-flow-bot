import type { Order } from './order';

export interface DailyReportSummary {
  date: string;
  count: number;
  revenue: string;
  paidRevenue: string;
  cashCount: number;
  canceledCount: number;
}

export interface DailyReportDetail {
  date: string;
  summary: DailyReportSummary;
  orders: Order[];
}
