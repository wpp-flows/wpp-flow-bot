import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';

export function AuthLayout() {
  return (
    <div className="relative min-h-screen w-full bg-background">
      <div className="absolute inset-0 gradient-mesh" aria-hidden />
      <div className="absolute inset-0 grid-pattern opacity-40" aria-hidden />
      <div className="relative flex min-h-screen items-center justify-center p-4">
        <Suspense fallback={null}>
          <Outlet />
        </Suspense>
      </div>
    </div>
  );
}
