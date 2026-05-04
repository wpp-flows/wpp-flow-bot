import { type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'destructive' | 'info';
type Size = 'sm' | 'md';

const TONES: Record<Tone, string> = {
  neutral: 'bg-muted text-muted-foreground',
  primary: 'bg-primary-soft text-primary dark:text-primary-foreground',
  success: 'bg-success-soft text-success dark:text-success-foreground',
  warning: 'bg-warning-soft text-warning dark:text-warning-foreground',
  destructive: 'bg-destructive-soft text-destructive dark:text-destructive-foreground',
  info: 'bg-info-soft text-info dark:text-info-foreground',
};

const SIZES: Record<Size, string> = {
  sm: 'h-5 px-2 text-2xs',
  md: 'h-6 px-2.5 text-xs',
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  size?: Size;
  dot?: boolean;
}

export function Badge({ tone = 'neutral', size = 'md', dot, className, children, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium tracking-tight whitespace-nowrap',
        TONES[tone],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {dot ? (
        <span
          aria-hidden
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            tone === 'success' && 'bg-success animate-pulse-soft',
            tone === 'destructive' && 'bg-destructive',
            tone === 'warning' && 'bg-warning',
            tone === 'info' && 'bg-info',
            tone === 'primary' && 'bg-primary',
            tone === 'neutral' && 'bg-muted-foreground',
          )}
        />
      ) : null}
      {children}
    </span>
  );
}
