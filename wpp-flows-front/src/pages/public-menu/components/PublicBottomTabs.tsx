import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type PublicTab = 'catalog' | 'orders' | 'checkout';

interface TabDescriptor {
  id: PublicTab;
  label: string;
  icon: ReactNode;
  badge?: number | null;
}

interface Props {
  active: PublicTab;
  onChange: (tab: PublicTab) => void;
  tabs: TabDescriptor[];
}

export function PublicBottomTabs({ active, onChange, tabs }: Readonly<Props>) {
  return (
    <nav
      aria-label="Navegação"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-card/85"
    >
      <ul className="mx-auto flex max-w-3xl items-stretch">
        {tabs.map((tab) => {
          const isActive = tab.id === active;
          return (
            <li key={tab.id} className="flex-1">
              <button
                type="button"
                onClick={() => onChange(tab.id)}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'relative flex w-full flex-col items-center gap-0.5 py-2 text-2xs font-medium transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <span className="relative inline-flex h-6 items-center justify-center [&_svg]:h-5 [&_svg]:w-5">
                  {tab.icon}
                  {tab.badge && tab.badge > 0 ? (
                    <span className="absolute -right-2 -top-1 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground">
                      {tab.badge > 99 ? '99+' : tab.badge}
                    </span>
                  ) : null}
                </span>
                <span>{tab.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
