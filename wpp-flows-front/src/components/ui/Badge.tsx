import { type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'destructive' | 'info';
type Size = 'sm' | 'md';

/**
 * Each tone uses its semantic *-soft surface and the bright accent color for text.
 * In dark mode the same tokens already resolve to a darker surface + brighter accent,
 * so the contrast holds without needing a `dark:` override (the previous
 * `dark:text-*-foreground` made the text near-black against a dark surface and
 * caused the "dull" look in the flow builder badges).
 */
const TONES: Record<Tone, string> = {
  neutral: 'bg-muted text-foreground',
  primary: 'bg-primary-soft text-primary',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  destructive: 'bg-destructive-soft text-destructive',
  info: 'bg-info-soft text-info',
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
