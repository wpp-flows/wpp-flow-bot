import { useEffect } from 'react';
import { useThemeStore } from '@/stores/themeStore';

const applyTheme = (resolved: 'light' | 'dark') => {
  const root = document.documentElement;
  root.classList.toggle('dark', resolved === 'dark');
  root.style.colorScheme = resolved;
};

export function useTheme() {
  const theme = useThemeStore((s) => s.theme);
  const resolved = useThemeStore((s) => s.resolved);
  const setTheme = useThemeStore((s) => s.setTheme);
  const setResolved = useThemeStore((s) => s.setResolved);
  const toggle = useThemeStore((s) => s.toggle);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const next: 'light' | 'dark' =
      theme === 'system' ? (media.matches ? 'dark' : 'light') : theme;
    setResolved(next);
    applyTheme(next);

    if (theme === 'system') {
      const handler = (e: MediaQueryListEvent) => {
        const v = e.matches ? 'dark' : 'light';
        setResolved(v);
        applyTheme(v);
      };
      media.addEventListener('change', handler);
      return () => media.removeEventListener('change', handler);
    }
  }, [theme, setResolved]);

  return { theme, resolved, setTheme, toggle };
}
