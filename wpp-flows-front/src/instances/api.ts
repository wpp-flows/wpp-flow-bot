/**
 * HTTP API instance for the Mesa backend.
 *
 * All service modules go through `apiCall`. Cookies are forwarded
 * (`credentials: 'include'`) so the session managed by better-auth
 * on the backend is automatically attached.
 */

const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8080';

export interface ApiCallOptions<TBody = unknown> {
  endpoint: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: TBody;
  query?: Record<string, string | number | boolean | undefined | null>;
  /** When true, do not throw on 401 — return null instead. */
  allow401AsNull?: boolean;
}

export class ApiError extends Error {
  status: number;
  endpoint: string;
  details?: unknown;

  constructor(message: string, status: number, endpoint: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.endpoint = endpoint;
    this.details = details;
  }
}

function buildUrl(endpoint: string, query?: ApiCallOptions['query']) {
  const url = new URL(endpoint.replace(/^\//, ''), API_URL.endsWith('/') ? API_URL : `${API_URL}/`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null) continue;
      url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

export async function apiCall<TResult = unknown, TBody = unknown>(
  options: ApiCallOptions<TBody>,
): Promise<TResult> {
  const { endpoint, method = 'GET', body, query, allow401AsNull } = options;
  const url = buildUrl(endpoint, query);

  const init: RequestInit = {
    method,
    credentials: 'include',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  };

  const res = await fetch(url, init);

  if (allow401AsNull && res.status === 401) {
    return null as TResult;
  }

  if (res.status === 204) {
    return undefined as TResult;
  }

  const text = await res.text();
  const data = text ? safeJson(text) : null;

  if (!res.ok) {
    const message =
      (data && typeof data === 'object' && 'error' in (data as object)
        ? (data as { error: string }).error
        : null) ?? `Request failed with status ${res.status}`;
    throw new ApiError(message, res.status, endpoint, data);
  }

  return data as TResult;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export const API_BASE_URL = API_URL;
