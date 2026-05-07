import { apiCall } from '@/instances/api';
import type {
  CreateFlowPayload,
  Flow,
  FlowStepInput,
  FlowWithSteps,
  NewFlowVersionPayload,
} from '@/types';

export const flowService = {
  list(): Promise<Flow[]> {
    return apiCall<Flow[]>({ endpoint: '/api/flows' });
  },

  getActive(): Promise<FlowWithSteps | null> {
    return apiCall<FlowWithSteps | null>({ endpoint: '/api/flows/active' });
  },

  getById(id: string): Promise<FlowWithSteps> {
    return apiCall<FlowWithSteps>({ endpoint: `/api/flows/${id}` });
  },

  create(payload: CreateFlowPayload): Promise<FlowWithSteps> {
    return apiCall<FlowWithSteps>({
      endpoint: '/api/flows',
      method: 'POST',
      body: payload,
    });
  },

  rename(id: string, name: string): Promise<Flow> {
    return apiCall<Flow>({
      endpoint: `/api/flows/${id}`,
      method: 'PATCH',
      body: { name },
    });
  },

  remove(id: string): Promise<void> {
    return apiCall<void>({ endpoint: `/api/flows/${id}`, method: 'DELETE' });
  },

  newVersion(id: string, payload: NewFlowVersionPayload = {}): Promise<FlowWithSteps> {
    return apiCall<FlowWithSteps>({
      endpoint: `/api/flows/${id}/new-version`,
      method: 'POST',
      body: payload,
    });
  },

  activate(id: string): Promise<FlowWithSteps> {
    return apiCall<FlowWithSteps>({
      endpoint: `/api/flows/${id}/activate`,
      method: 'PATCH',
    });
  },

  saveSteps(id: string, steps: FlowStepInput[]): Promise<FlowWithSteps> {
    return apiCall<FlowWithSteps>({
      endpoint: `/api/flows/${id}/steps`,
      method: 'PUT',
      body: { steps },
    });
  },

  reorderSteps(id: string, orderedIds: string[]): Promise<FlowWithSteps> {
    return apiCall<FlowWithSteps>({
      endpoint: `/api/flows/${id}/steps/reorder`,
      method: 'PATCH',
      body: { orderedIds },
    });
  },
};
