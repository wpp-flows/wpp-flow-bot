import { useNavigate } from 'react-router-dom';
import { Bike, Utensils } from 'lucide-react';
import { ROUTES } from '@/constants/app';
import { useServiceModeStore, type ServiceMode } from '@/stores/serviceModeStore';
import { cn } from '@/lib/utils';

export function ServiceModeSwitch() {
  const mode = useServiceModeStore((s) => s.mode);
  const setMode = useServiceModeStore((s) => s.setMode);
  const navigate = useNavigate();

  function switchTo(next: ServiceMode) {
    if (next === mode) return;
    setMode(next);
    navigate(next === 'LOCAL' ? ROUTES.localTables : ROUTES.dashboard);
  }

  return (
    <div className="mx-3 mt-3 rounded-lg border border-sidebar-border bg-sidebar-accent/40 p-1">
      <div className="grid grid-cols-2 gap-1">
        <ModeButton
          active={mode === 'DELIVERY'}
          tone="delivery"
          icon={<Bike className="h-3.5 w-3.5" />}
          label="Delivery"
          onClick={() => switchTo('DELIVERY')}
        />
        <ModeButton
          active={mode === 'LOCAL'}
          tone="local"
          icon={<Utensils className="h-3.5 w-3.5" />}
          label="Salão"
          onClick={() => switchTo('LOCAL')}
        />
      </div>
    </div>
  );
}

function ModeButton({
  active,
  tone,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  tone: 'delivery' | 'local';
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  const activeStyles =
    tone === 'local'
      ? 'bg-teal-500/15 text-teal-700 dark:text-teal-300 ring-1 ring-teal-500/30'
      : 'bg-primary/15 text-primary ring-1 ring-primary/30';
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
        active
          ? activeStyles
          : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground',
      )}
    >
      {icon}
      {label}
    </button>
  );
}
