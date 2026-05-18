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
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
            {props.label}
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold tracking-tight text-foreground">
              {props.value}
            </span>
            {props.delta != null ? (
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 text-2xs font-medium',
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
            <p className="text-xs text-muted-foreground">{props.hint}</p>
          ) : null}
        </div>
        <span
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-lg [&_svg]:h-4.5 [&_svg]:w-4.5',
            ICON_TONES[props.tone],
          )}
        >
          {props.icon}
        </span>
      </div>
    </Card>
  );
}
