import { apiCall } from '@/instances/api';

export interface OrderTemplateVariable {
  key: string;
  label: string;
  description: string;
}

export const templateVariablesService = {
  list(): Promise<OrderTemplateVariable[]> {
    return apiCall<OrderTemplateVariable[]>({
      endpoint: '/api/organization/template-variables',
    });
  },
};
