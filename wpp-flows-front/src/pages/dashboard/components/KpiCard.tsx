import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

type Tone = 'primary' | 'info' | 'warning' | 'success';

const ICON_TONES: Record<Tone, string> = {
  primary: 'bg-primary-soft text-primary',
  info: 'bg-info-soft text-info',
  warning: 'bg-warning-soft text-warning',
  success: 'bg-success-soft text-success',
};

interface Props {
  icon: React.ReactNode;
  tone: Tone;
  label: string;
  value: string;
  hint?: string;
  delta?: number | null;
}

export function KpiCard(props: Props) {
  const positive = (props.delta ?? 0) >= 0;
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="truncate text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
            {props.label}
          </p>
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              {props.value}
            </span>
            {props.delta != null ? (
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 whitespace-nowrap text-2xs font-medium',
                  positive ? 'text-success' : 'text-destructive',
                )}
              >
                {positive ? (
                  <ArrowUpRight className="h-3 w-3" />
                ) : (
                  <ArrowDownRight className="h-3 w-3" />
                )}
                {Math.abs(props.delta).toFixed(1)}%
              </span>
            ) : null}
          </div>
          {props.hint ? (
            <p className="truncate text-xs text-muted-foreground" title={props.hint}>
              {props.hint}
            </p>
          ) : null}
        </div>
        <span
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:h-10 sm:w-10 [&_svg]:h-4 [&_svg]:w-4 sm:[&_svg]:h-4.5 sm:[&_svg]:w-4.5',
            ICON_TONES[props.tone],
          )}
        >
          {props.icon}
        </span>
      </div>
    </Card>
  );
}
