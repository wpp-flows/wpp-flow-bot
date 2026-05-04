/**
 * Tiny typed wrapper over localStorage. Used by mock services to persist
 * mocked data across reloads — replace with the real backend later.
 */
export const storage = {
  get<T>(key: string, fallback: T): T {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  },
  set<T>(key: string, value: T): void {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* quota or private mode — ignore */
    }
  },
  remove(key: string): void {
    window.localStorage.removeItem(key);
  },
  clear(): void {
    window.localStorage.clear();
  },
};
