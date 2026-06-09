import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { API_BASE_URL } from '@/instances/api';

export function usePublicTableRealtime(token: string): void {
  const qc = useQueryClient();

  useEffect(() => {
    if (!token) return;
    if (typeof globalThis.window === 'undefined') return;

    const url = new URL(
      `api/public/tables/${encodeURIComponent(token)}/events`,
      API_BASE_URL.endsWith('/') ? API_BASE_URL : `${API_BASE_URL}/`,
    ).toString();

    const source = new EventSource(url);

    source.onmessage = () => {
      void qc.invalidateQueries({ queryKey: ['public-table-orders', token] });
      void qc.invalidateQueries({ queryKey: ['public-table', token] });
    };

    return () => {
      source.close();
    };
  }, [token, qc]);
}
