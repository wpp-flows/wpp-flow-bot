import { type ReactNode } from 'react';
import { useTheme } from '@/hooks/useTheme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Subscribes to theme store and applies the .dark class to <html>
  useTheme();
  return <>{children}</>;
}
