import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'outline' | 'link';
type Size = 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] shadow-soft-sm',
  secondary:
    'bg-secondary text-secondary-foreground hover:bg-muted active:scale-[0.98] shadow-soft-sm',
  ghost: 'hover:bg-muted text-foreground',
  destructive:
    'bg-destructive text-destructive-foreground hover:bg-destructive/90 active:scale-[0.98] shadow-soft-sm',
  outline:
    'border border-border bg-background text-foreground hover:bg-muted active:scale-[0.98]',
  link: 'text-primary hover:underline underline-offset-4 px-0',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-md',
  md: 'h-9 px-4 text-sm gap-2 rounded-md',
  lg: 'h-11 px-6 text-sm gap-2 rounded-lg',
  icon: 'h-9 w-9 rounded-md',
  'icon-sm': 'h-8 w-8 rounded-md',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    leftIcon,
    rightIcon,
    children,
    className,
    disabled,
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-medium tracking-tight',
        'transition-all duration-150 ease-out',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:pointer-events-none disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : leftIcon ? (
        <span className="shrink-0 [&_svg]:h-4 [&_svg]:w-4">{leftIcon}</span>
      ) : null}
      {children}
      {!loading && rightIcon ? (
        <span className="shrink-0 [&_svg]:h-4 [&_svg]:w-4">{rightIcon}</span>
      ) : null}
    </button>
  );
});
