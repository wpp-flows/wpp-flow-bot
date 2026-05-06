import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, leftIcon, rightIcon, invalid, ...rest },
  ref,
) {
  return (
    <div className="relative w-full">
      {leftIcon ? (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground [&_svg]:h-4 [&_svg]:w-4">
          {leftIcon}
        </span>
      ) : null}
      <input
        ref={ref}
        className={cn(
          'h-10 w-full rounded-md border border-input bg-background text-sm text-foreground',
          'transition-shadow duration-150',
          'placeholder:text-muted-foreground/70',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background',
          'disabled:cursor-not-allowed disabled:opacity-50',
          leftIcon ? 'pl-10' : 'pl-3',
          rightIcon ? 'pr-10' : 'pr-3',
          invalid && 'border-destructive focus-visible:ring-destructive',
          className,
        )}
        aria-invalid={invalid || undefined}
        {...rest}
      />
      {rightIcon ? (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground [&_svg]:h-4 [&_svg]:w-4">
          {rightIcon}
        </span>
      ) : null}
    </div>
  );
});
