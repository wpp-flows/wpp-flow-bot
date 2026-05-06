import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import { useUiStore, type ToastTone } from '@/stores/uiStore';
import { cn } from '@/lib/utils';

const TONE_STYLES: Record<ToastTone, { icon: JSX.Element; ring: string; iconBg: string }> = {
  default: {
    icon: <Info />,
    ring: 'ring-border',
    iconBg: 'bg-muted text-muted-foreground',
  },
  success: {
    icon: <CheckCircle2 />,
    ring: 'ring-success/30',
    iconBg: 'bg-success-soft text-success',
  },
  error: {
    icon: <XCircle />,
    ring: 'ring-destructive/30',
    iconBg: 'bg-destructive-soft text-destructive',
  },
  warning: {
    icon: <AlertTriangle />,
    ring: 'ring-warning/30',
    iconBg: 'bg-warning-soft text-warning',
  },
  info: {
    icon: <Info />,
    ring: 'ring-info/30',
    iconBg: 'bg-info-soft text-info',
  },
};

export function Toaster() {
  const toasts = useUiStore((s) => s.toasts);
  const dismiss = useUiStore((s) => s.dismissToast);

  return (
    <div
      role="region"
      aria-label="Notifications"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 px-4 pb-6 sm:right-6 sm:bottom-6 sm:left-auto sm:items-end"
    >
      {toasts.map((t) => {
        const style = TONE_STYLES[t.tone];
        return (
          <div
            key={t.id}
            role="alert"
            className={cn(
              'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border border-border bg-card p-3 shadow-soft-md ring-1 animate-fade-in-up',
              style.ring,
            )}
          >
            <div
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-md [&_svg]:h-4 [&_svg]:w-4',
                style.iconBg,
              )}
            >
              {style.icon}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p className="text-sm font-medium tracking-tight text-foreground">{t.title}</p>
              {t.description ? (
                <p className="text-xs text-muted-foreground text-pretty">{t.description}</p>
              ) : null}
            </div>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => dismiss(t.id)}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
