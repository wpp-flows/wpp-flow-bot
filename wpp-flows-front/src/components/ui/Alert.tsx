import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type AlertVariant = 'default' | 'info' | 'warning' | 'destructive' | 'success';

const VARIANTS: Record<AlertVariant, string> = {
  default: 'bg-card text-foreground border-border',
  info: 'border-info/30 bg-info-soft text-info [&>svg]:text-info',
  warning: 'border-warning/30 bg-warning-soft text-warning [&>svg]:text-warning',
  destructive:
    'border-destructive/30 bg-destructive-soft text-destructive [&>svg]:text-destructive',
  success: 'border-success/30 bg-success-soft text-success [&>svg]:text-success',
};

export const Alert = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement> & { variant?: AlertVariant }
>(function Alert({ className, variant = 'default', ...props }, ref) {
  return (
    <div
      ref={ref}
      role="alert"
      className={cn(
        'relative w-full rounded-lg border px-4 py-3 text-sm',
        '[&>svg]:absolute [&>svg]:left-4 [&>svg]:top-3.5 [&>svg]:size-4',
        '[&>svg~*]:pl-7',
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  );
});

export const AlertTitle = forwardRef<
  HTMLHeadingElement,
  HTMLAttributes<HTMLHeadingElement>
>(function AlertTitle({ className, ...props }, ref) {
  return (
    <h5
      ref={ref}
      className={cn('mb-1 text-sm font-semibold leading-none tracking-tight', className)}
      {...props}
    />
  );
});

export const AlertDescription = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLParagraphElement>
>(function AlertDescription({ className, ...props }, ref) {
  return (
    <div
      ref={ref}
      className={cn('text-xs [&_p]:leading-relaxed text-pretty', className)}
      {...props}
    />
  );
});
