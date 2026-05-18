import { Monitor, Moon, Sun } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import type { Theme } from '@/stores/themeStore';

const THEMES: { value: Theme; label: string; icon: React.ReactNode }[] = [
  { value: 'light', label: 'Claro', icon: <Sun /> },
  { value: 'dark', label: 'Escuro', icon: <Moon /> },
  { value: 'system', label: 'Sistema', icon: <Monitor /> },
];

interface Props {
  themeMode: Theme;
  setTheme: (t: Theme) => void;
}

export function AppearanceSection({ themeMode, setTheme }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Aparência</CardTitle>
        <CardDescription>
          Escolha o tema que combina com seu horário de atendimento.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {THEMES.map((t) => {
            const active = themeMode === t.value;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => setTheme(t.value)}
                className={cn(
                  'flex items-center gap-3 rounded-lg border bg-card p-4 text-left transition-all',
                  active
                    ? 'border-primary ring-2 ring-primary/20'
                    : 'border-border hover:border-foreground/20',
                )}
              >
                <span
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-md [&_svg]:h-4 [&_svg]:w-4',
                    active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                  )}
                >
                  {t.icon}
                </span>
                <div>
                  <p className="text-sm font-semibold tracking-tight">{t.label}</p>
                  <p className="text-2xs text-muted-foreground">
                    {t.value === 'system'
                      ? 'Siga a preferência do sistema.'
                      : `Use sempre o modo ${t.label.toLowerCase()}.`}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
