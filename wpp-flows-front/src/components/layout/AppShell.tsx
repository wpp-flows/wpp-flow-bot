import { Suspense, useEffect, useRef } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useAuth } from '@/hooks/useAuth';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { shouldAutoStartTour, startTour } from '@/lib/tour';

export function AppShell() {
  const { organization } = useAuth();
  const navigate = useNavigate();
  useRealtimeSync(!!organization);

  const tourKickedRef = useRef(false);

  useEffect(() => {
    if (!organization) return;
    if (tourKickedRef.current) return;
    if (!shouldAutoStartTour()) return;
    tourKickedRef.current = true;
    const t = setTimeout(() => startTour((path) => navigate(path)), 500);
    return () => clearTimeout(t);
  }, [organization, navigate]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-8 scrollbar-thin">
          <div className="mx-auto w-full max-w-[1440px]">
            <Suspense fallback={null}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}
