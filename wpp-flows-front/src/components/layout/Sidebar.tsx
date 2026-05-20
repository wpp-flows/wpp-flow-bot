import { NavLink } from 'react-router-dom';
import { Bot, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { NAV_GROUPS } from '@/constants/navigation';
import { APP_CONFIG } from '@/constants/app';
import { cn } from '@/lib/utils';
import { useUiStore } from '@/stores/uiStore';
import { IconButton } from '@/components/ui/IconButton';

type Phase = 'closed' | 'opening' | 'open';

const MOBILE_QUERY = '(max-width: 1023px)';

export function Sidebar() {
  const open = useUiStore((s) => s.sidebarOpen);
  const setOpen = useUiStore((s) => s.setSidebarOpen);
  const [phase, setPhase] = useState<Phase>('closed');
  const [isMobile, setIsMobile] = useState(() => globalThis.matchMedia(MOBILE_QUERY).matches);

  useEffect(() => {
    const mq = globalThis.matchMedia(MOBILE_QUERY);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (open && phase === 'closed') {
      setPhase('opening');
      const t = setTimeout(() => setPhase('open'), 360);
      return () => clearTimeout(t);
    }
    if (!open && phase !== 'closed') {
      setPhase('closed');
    }
  }, [open, phase]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const overlayActive = phase !== 'closed';
  const sidebarVisible = phase === 'open';

  return (
    <>
      {/* Mobile backdrop — also captures stray taps so they never hit content behind */}
      <div
        className={cn(
          'fixed inset-0 z-30 bg-foreground/55 backdrop-blur-sm transition-opacity duration-200 lg:hidden',
          overlayActive ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={() => setOpen(false)}
        aria-hidden
      />

      {phase === 'opening' && (
        <div
          className="pointer-events-none fixed inset-0 z-40 flex items-start justify-center pt-28 lg:hidden"
          aria-hidden
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-soft-lg animate-bot-wake">
            <Bot className="h-9 w-9" />
          </span>
        </div>
      )}

      <aside
        className={cn(
          'fixed z-40 flex flex-col bg-sidebar text-sidebar-foreground',
          // Mobile: fullscreen sheet that slides down from the top edge.
          'inset-0 transition-transform duration-300 ease-out',
          sidebarVisible ? 'translate-y-0' : '-translate-y-full',
          // Desktop: docked sidebar, no transform — keep the original behavior.
          'lg:static lg:inset-auto lg:w-64 lg:translate-y-0 lg:border-r lg:border-sidebar-border',
        )}
        aria-hidden={isMobile && !sidebarVisible}
      >
        <div className="flex h-16 items-center justify-between gap-2 px-5 border-b border-sidebar-border">
          <a href="/" className="flex items-center gap-2.5 group">
            <span className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-soft-sm transition-transform group-hover:scale-105">
              <Bot className="h-4.5 w-4.5" />
              <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-50" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success ring-2 ring-sidebar" />
              </span>
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-sm font-semibold tracking-tight">{APP_CONFIG.name}</span>
              <span className="text-2xs text-muted-foreground">{APP_CONFIG.tagline}</span>
            </span>
          </a>
          <IconButton
            size="sm"
            variant="ghost"
            className="lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Close sidebar"
          >
            <X />
          </IconButton>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin">
          {NAV_GROUPS.map((group) => (
            <div key={group.title} className="space-y-1">
              {group.title ? (
                <p className="px-3 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.title}
                </p>
              ) : null}
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        end={item.to === '/'}
                        onClick={() => setOpen(false)}
                        className={({ isActive }) =>
                          cn(
                            'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium tracking-tight',
                            'transition-colors duration-150',
                            isActive
                              ? 'bg-primary-soft text-primary'
                              : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground',
                          )
                        }
                      >
                        <Icon className="h-4 w-4" />
                        <span className="flex-1">{item.label}</span>
                        {item.badge ? (
                          <span className="rounded-full bg-primary px-1.5 py-0.5 text-2xs font-semibold text-primary-foreground">
                            {item.badge}
                          </span>
                        ) : null}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
