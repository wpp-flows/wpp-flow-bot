import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LogOut, Mail, ArrowLeft } from 'lucide-react';
import { ROUTES, APP_CONFIG } from '@/constants/app';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

export function AdminShell() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate(ROUTES.login, { replace: true });
  };

  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <div className="mx-auto flex min-h-screen max-w-[1400px]">
        <aside className="hidden w-64 shrink-0 border-r border-zinc-200 lg:flex lg:flex-col">
          <div className="flex h-16 items-center gap-2 border-b border-zinc-200 px-6">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-zinc-900 text-white">
              <span className="text-xs font-bold tracking-tight">M</span>
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold tracking-tight">
                {APP_CONFIG.name}
              </span>
              <span className="text-2xs uppercase tracking-wider text-zinc-500">
                Backoffice
              </span>
            </div>
          </div>

          <nav className="flex-1 px-3 py-4">
            <p className="px-3 pb-2 text-2xs font-medium uppercase tracking-wider text-zinc-500">
              Acesso
            </p>
            <AdminNavItem
              to={ROUTES.adminInvitations}
              icon={<Mail className="h-4 w-4" />}
              label="Convites"
            />
          </nav>

          <div className="border-t border-zinc-200 p-3">
            <a
              href={ROUTES.dashboard}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Sair do backoffice
            </a>
            <button
              type="button"
              onClick={handleSignOut}
              className="mt-1 flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
            >
              <LogOut className="h-4 w-4" />
              Sair da conta
            </button>
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-zinc-200 px-6">
            <div className="lg:hidden flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded bg-zinc-900 text-white">
                <span className="text-xs font-bold tracking-tight">M</span>
              </div>
              <span className="text-sm font-semibold tracking-tight">
                {APP_CONFIG.name} Backoffice
              </span>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium leading-none">{user?.name}</p>
                <p className="mt-1 text-xs text-zinc-500">{user?.email}</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-900 text-sm font-semibold text-white">
                {user?.name?.charAt(0) ?? 'A'}
              </div>
            </div>
          </div>

          <div className="flex-1 px-6 py-8 sm:px-8 lg:px-12 lg:py-10">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

function AdminNavItem({
  to,
  icon,
  label,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
          isActive
            ? 'bg-zinc-100 font-medium text-zinc-900'
            : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900',
        )
      }
    >
      {icon}
      {label}
    </NavLink>
  );
}
