import { cn } from '@/lib/utils';

interface Props {
  label: string;
  active: boolean;
  count: number;
  onClick: () => void;
}

export function FilterChip({ label, active, count, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition',
        active
          ? 'border-primary bg-primary-soft text-primary'
          : 'border-border bg-card text-muted-foreground hover:text-foreground',
      )}
    >
      <span>{label}</span>
      <span className="rounded-full bg-muted px-1.5 py-0.5 text-2xs text-muted-foreground">
        {count}
      </span>
    </button>
  );
}
