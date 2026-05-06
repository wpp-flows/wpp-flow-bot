import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'ghost' | 'outline' | 'soft';
type Size = 'sm' | 'md';

const VARIANTS: Record<Variant, string> = {
  ghost: 'hover:bg-muted text-muted-foreground hover:text-foreground',
  outline: 'border border-border bg-background text-foreground hover:bg-muted',
  soft: 'bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground',
};

const SIZES: Record<Size, string> = {
  sm: 'h-7 w-7 [&_svg]:h-3.5 [&_svg]:w-3.5',
  md: 'h-9 w-9 [&_svg]:h-4 [&_svg]:w-4',
};

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { variant = 'ghost', size = 'md', className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center rounded-md transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background',
        'active:scale-[0.94]',
        'disabled:pointer-events-none disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
});
