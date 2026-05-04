import { API_LATENCY_MS } from '@/constants/app';
import { sleep } from '@/lib/utils';

/**
 * Mock API instance.
 *
 * This file is the single replacement point when the real Evolution API
 * backend ships. Every service method goes through `apiCall` so swapping
 * fetch/axios in here will instantly migrate the entire app.
 *
 * Real implementation will look like:
 *   export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL })
 *   apiCall = (endpoint, init) => api.request(...)
 */

export interface ApiCallOptions<TBody = unknown> {
  endpoint: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: TBody;
  delay?: number;
  shouldFail?: boolean;
}

export class ApiError extends Error {
  status: number;
  endpoint: string;

  constructor(message: string, status = 500, endpoint = '') {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.endpoint = endpoint;
  }
}

/**
 * Simulates an async network round-trip. Replace with a real fetch later.
 */
export async function apiCall<TResult, TBody = unknown>(
  options: ApiCallOptions<TBody>,
  resolver: () => TResult | Promise<TResult>,
): Promise<TResult> {
  const { endpoint, delay = API_LATENCY_MS, shouldFail = false } = options;

  await sleep(delay + Math.random() * 200);

  if (shouldFail) {
    throw new ApiError('Mock API failure', 500, endpoint);
  }

  return resolver();
}
