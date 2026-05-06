import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface TabItem {
  value: string;
  label: string;
  icon?: ReactNode;
}

interface TabsProps {
  value: string;
  onValueChange: (next: string) => void;
  items: TabItem[];
  className?: string;
}

export function Tabs({ value, onValueChange, items, className }: TabsProps) {
  return (
    <div
      role="tablist"
      className={cn(
        'inline-flex items-center gap-1 rounded-lg border border-border bg-card p-1 shadow-soft-sm',
        className,
      )}
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onValueChange(item.value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              active
                ? 'bg-primary text-primary-foreground shadow-soft-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted',
            )}
          >
            {item.icon ? (
              <span className="[&_svg]:h-3.5 [&_svg]:w-3.5">{item.icon}</span>
            ) : null}
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
