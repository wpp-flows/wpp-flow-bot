import { apiCall } from '@/instances/api';
import type { DashboardOverview } from '@/types';

export const dashboardService = {
  overview(): Promise<DashboardOverview> {
    return apiCall<DashboardOverview>({ endpoint: '/api/dashboard/overview' });
  },
};
