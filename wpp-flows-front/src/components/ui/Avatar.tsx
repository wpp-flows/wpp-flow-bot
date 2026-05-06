import { type HTMLAttributes } from 'react';
import { cn, getInitials } from '@/lib/utils';

interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  name?: string;
  src?: string;
  size?: 'sm' | 'md' | 'lg';
}

const SIZES = {
  sm: 'h-7 w-7 text-2xs',
  md: 'h-9 w-9 text-xs',
  lg: 'h-11 w-11 text-sm',
};

export function Avatar({ name = '', src, size = 'md', className, ...rest }: AvatarProps) {
  return (
    <div
      className={cn(
        'relative inline-flex items-center justify-center overflow-hidden rounded-full bg-primary-soft text-primary font-semibold ring-1 ring-border',
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {src ? (
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span aria-hidden>{getInitials(name) || '·'}</span>
      )}
    </div>
  );
}
