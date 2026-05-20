import { Menu, Moon, Search, Sun, LogOut } from 'lucide-react';
import { useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { IconButton } from '@/components/ui/IconButton';
import { Input } from '@/components/ui/Input';
import { useUiStore } from '@/stores/uiStore';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/constants/app';
import { NotificationsBell } from './NotificationsBell';

export function Topbar() {
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const { user, organization, signOut } = useAuth();
  const { resolved, toggle } = useTheme();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-xl lg:px-6">
      <IconButton variant="ghost" onClick={toggleSidebar} className="lg:hidden" aria-label="Open menu">
        <Menu />
      </IconButton>

      <div className="hidden flex-1 max-w-md md:block">
        <Input
          type="search"
          placeholder="Search conversations, items, flows…"
          leftIcon={<Search />}
          className="h-9 bg-muted/50"
        />
      </div>

      <div className="ml-auto flex items-center gap-1.5">
          <IconButton variant="ghost" onClick={toggle} aria-label="Toggle theme">
            {resolved === 'dark' ? <Sun /> : <Moon />}
          </IconButton>
          <NotificationsBell />

        <div className="relative ml-2">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            onBlur={() => setTimeout(() => setMenuOpen(false), 150)}
            className="flex items-center gap-2.5 rounded-lg pl-1 pr-2.5 py-1 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Avatar name={user?.name ?? ''} src={user?.image ?? undefined} size="md" />
            <span className="hidden flex-col items-start leading-tight md:flex">
              <span className="text-xs font-semibold tracking-tight">{user?.name ?? 'Guest'}</span>
              <span className="text-2xs text-muted-foreground">{organization?.name ?? '—'}</span>
            </span>
          </button>

          <div
            className={cn(
              'absolute right-0 top-full mt-2 w-56 rounded-lg border border-border bg-popover p-1 shadow-soft-md',
              'origin-top-right transition-all duration-150',
              menuOpen ? 'opacity-100 scale-100' : 'pointer-events-none opacity-0 scale-95',
            )}
          >
            <div className="px-3 py-2 border-b border-border">
              <p className="text-xs font-semibold tracking-tight">{user?.name}</p>
              <p className="text-2xs text-muted-foreground truncate">{user?.email}</p>
            </div>
            <div className="py-1">
              <button
                type="button"
                onMouseDown={async () => {
                  await signOut();
                  navigate(ROUTES.login, { replace: true });
                }}
                className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive-soft"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sair
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
