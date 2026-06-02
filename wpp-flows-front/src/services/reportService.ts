import { apiCall } from '@/instances/api';
import type { DailyReportDetail, DailyReportSummary } from '@/types';

export const reportService = {
  listDaily(): Promise<DailyReportSummary[]> {
    return apiCall<DailyReportSummary[]>({ endpoint: '/api/reports/daily' });
  },

  getDaily(date: string): Promise<DailyReportDetail> {
    return apiCall<DailyReportDetail>({
      endpoint: `/api/reports/daily/${date}`,
    });
  },
};
