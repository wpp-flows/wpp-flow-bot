import { STORAGE_KEYS } from '@/constants/app';
import { apiCall, ApiError } from '@/instances/api';
import { storage } from '@/instances/storage';
import { generateId } from '@/lib/utils';
import type { CreateFlowPayload, Flow, FlowStep, UpdateFlowPayload } from '@/types';
import { mockFlows } from './_mockData';

const seed = (): Flow[] => {
  const stored = storage.get<Flow[] | null>(STORAGE_KEYS.flows, null);
  if (stored && stored.length) return stored;
  storage.set(STORAGE_KEYS.flows, mockFlows);
  return mockFlows;
};

const persist = (flows: Flow[]) => storage.set(STORAGE_KEYS.flows, flows);

export const flowService = {
  async list(): Promise<Flow[]> {
    return apiCall({ endpoint: '/flows' }, () => seed());
  },

  async getById(id: string): Promise<Flow> {
    return apiCall({ endpoint: `/flows/${id}` }, () => {
      const found = seed().find((f) => f.id === id);
      if (!found) throw new ApiError('Flow not found', 404, `/flows/${id}`);
      return found;
    });
  },

  async create(payload: CreateFlowPayload): Promise<Flow> {
    return apiCall({ endpoint: '/flows', method: 'POST', body: payload }, () => {
      const flows = seed();
      const now = new Date().toISOString();
      const flow: Flow = {
        id: generateId('flow'),
        name: payload.name,
        description: payload.description,
        isDefault: flows.length === 0,
        steps: [
          {
            id: generateId('step'),
            type: 'message',
            title: 'Welcome message',
            content: 'Hi! Welcome to our restaurant 👋',
          },
        ],
        createdAt: now,
        updatedAt: now,
      };
      persist([flow, ...flows]);
      return flow;
    });
  },

  async update(payload: UpdateFlowPayload): Promise<Flow> {
    return apiCall({ endpoint: `/flows/${payload.id}`, method: 'PATCH', body: payload }, () => {
      const flows = seed();
      const idx = flows.findIndex((f) => f.id === payload.id);
      if (idx < 0) throw new ApiError('Flow not found', 404, `/flows/${payload.id}`);
      const next: Flow = {
        ...flows[idx],
        ...payload,
        updatedAt: new Date().toISOString(),
      };
      const list = [...flows];
      list[idx] = next;
      persist(list);
      return next;
    });
  },

  async remove(id: string): Promise<void> {
    return apiCall({ endpoint: `/flows/${id}`, method: 'DELETE' }, () => {
      const flows = seed();
      persist(flows.filter((f) => f.id !== id));
    });
  },

  async saveSteps(flowId: string, steps: FlowStep[]): Promise<Flow> {
    return apiCall(
      { endpoint: `/flows/${flowId}/steps`, method: 'PUT', body: steps, delay: 350 },
      () => {
        const flows = seed();
        const idx = flows.findIndex((f) => f.id === flowId);
        if (idx < 0) throw new ApiError('Flow not found', 404, `/flows/${flowId}/steps`);
        const next: Flow = { ...flows[idx], steps, updatedAt: new Date().toISOString() };
        const list = [...flows];
        list[idx] = next;
        persist(list);
        return next;
      },
    );
  },
};
