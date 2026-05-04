import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
  size?: 'sm' | 'md';
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(function Switch(
  { className, size = 'md', checked, onChange, disabled, ...rest },
  ref,
) {
  const isSm = size === 'sm';
  return (
    <label
      className={cn(
        'relative inline-flex shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200',
        'border border-border',
        isSm ? 'h-5 w-9' : 'h-6 w-11',
        checked ? 'bg-primary' : 'bg-muted',
        disabled && 'opacity-50 cursor-not-allowed',
        className,
      )}
    >
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="sr-only peer"
        {...rest}
      />
      <span
        aria-hidden
        className={cn(
          'absolute left-0.5 top-1/2 -translate-y-1/2 rounded-full bg-background shadow-soft-sm transition-transform duration-200',
          isSm ? 'h-4 w-4' : 'h-5 w-5',
          checked ? (isSm ? 'translate-x-4' : 'translate-x-5') : 'translate-x-0',
        )}
      />
    </label>
  );
});
