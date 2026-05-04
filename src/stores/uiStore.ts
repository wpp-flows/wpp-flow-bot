import { create } from 'zustand';
import { generateId } from '@/lib/utils';

export type ToastTone = 'default' | 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
  duration?: number;
}

interface UiState {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;

  toasts: Toast[];
  pushToast: (toast: Omit<Toast, 'id'>) => string;
  dismissToast: (id: string) => void;
}

export const useUiStore = create<UiState>((set, get) => ({
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set({ sidebarOpen: !get().sidebarOpen }),

  toasts: [],
  pushToast: (toast) => {
    const id = generateId('toast');
    const next: Toast = { duration: 4500,  ...toast, id };
    set({ toasts: [...get().toasts, next] });
    if (next.duration && next.duration > 0) {
      setTimeout(() => get().dismissToast(id), next.duration);
    }
    return id;
  },
  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

export const toast = {
  show: (toast: Omit<Toast, 'id'>) => useUiStore.getState().pushToast(toast),
  success: (title: string, description?: string) =>
    useUiStore.getState().pushToast({ title, description, tone: 'success' }),
  error: (title: string, description?: string) =>
    useUiStore.getState().pushToast({ title, description, tone: 'error' }),
  info: (title: string, description?: string) =>
    useUiStore.getState().pushToast({ title, description, tone: 'info' }),
  warning: (title: string, description?: string) =>
    useUiStore.getState().pushToast({ title, description, tone: 'warning' }),
};
