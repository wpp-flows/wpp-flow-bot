import { Suspense } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { ROUTES } from '@/constants/app';

export function AuthLayout() {
  return (
    <div className="relative min-h-screen w-full bg-background">
      <div className="absolute inset-0 gradient-mesh" aria-hidden />
      <div className="absolute inset-0 grid-pattern opacity-40" aria-hidden />
      <div className="relative flex min-h-screen flex-col">
        <div className="flex flex-1 items-center justify-center p-4">
          <Suspense fallback={null}>
            <Outlet />
          </Suspense>
        </div>
        <footer className="relative z-10 px-4 pb-4 text-center text-2xs text-muted-foreground">
          <Link to={ROUTES.privacy} className="hover:text-foreground hover:underline">
            Política de Privacidade
          </Link>
          <span className="mx-2">·</span>
          <Link to={ROUTES.terms} className="hover:text-foreground hover:underline">
            Termos de Uso
          </Link>
        </footer>
      </div>
    </div>
  );
}
