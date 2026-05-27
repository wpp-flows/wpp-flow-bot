import { API_BASE_URL, ApiError } from '@/instances/api';

export interface UploadResponse {
  url: string;
  key: string;
}

export const uploadService = {
  async menuItemImage(file: File): Promise<UploadResponse> {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${API_BASE_URL}/api/uploads/menu-item`, {
      method: 'POST',
      credentials: 'include',
      body: form,
    });

    const text = await res.text();
    const data = text ? safeJson(text) : null;
    if (!res.ok) {
      const message =
        (data && typeof data === 'object' && 'error' in (data as object)
          ? (data as { error: string }).error
          : null) ?? `Falha no upload (${res.status})`;
      throw new ApiError(message, res.status, '/api/uploads/menu-item', data);
    }
    return data as UploadResponse;
  },
};

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
