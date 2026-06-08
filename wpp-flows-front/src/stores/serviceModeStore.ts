import { create } from 'zustand';

export type ServiceMode = 'DELIVERY' | 'LOCAL';

const STORAGE_KEY = 'mesa.service-mode';

function readInitial(): ServiceMode {
  if (typeof globalThis.window === 'undefined') return 'DELIVERY';
  const raw = globalThis.window.localStorage.getItem(STORAGE_KEY);
  return raw === 'LOCAL' ? 'LOCAL' : 'DELIVERY';
}

interface ServiceModeState {
  mode: ServiceMode;
  setMode: (next: ServiceMode) => void;
  toggle: () => void;
}

export const useServiceModeStore = create<ServiceModeState>((set, get) => ({
  mode: readInitial(),
  setMode: (next) => {
    if (typeof globalThis.window !== 'undefined') {
      globalThis.window.localStorage.setItem(STORAGE_KEY, next);
    }
    set({ mode: next });
  },
  toggle: () => {
    const next: ServiceMode = get().mode === 'DELIVERY' ? 'LOCAL' : 'DELIVERY';
    get().setMode(next);
  },
}));
