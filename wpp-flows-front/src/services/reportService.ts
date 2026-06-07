import { apiCall } from '@/instances/api';
import type {
  DailyReportDetail,
  DailyReportSummary,
  WalletServiceType,
} from '@/types';

export const reportService = {
  listDaily(filters: { serviceType?: WalletServiceType } = {}): Promise<
    DailyReportSummary[]
  > {
    const params = new URLSearchParams();
    if (filters.serviceType) params.set('serviceType', filters.serviceType);
    const qs = params.toString();
    return apiCall<DailyReportSummary[]>({
      endpoint: qs ? `/api/reports/daily?${qs}` : '/api/reports/daily',
    });
  },

  getDaily(
    date: string,
    filters: { serviceType?: WalletServiceType } = {},
  ): Promise<DailyReportDetail> {
    const params = new URLSearchParams();
    if (filters.serviceType) params.set('serviceType', filters.serviceType);
    const qs = params.toString();
    return apiCall<DailyReportDetail>({
      endpoint: qs
        ? `/api/reports/daily/${date}?${qs}`
        : `/api/reports/daily/${date}`,
    });
  },
};
