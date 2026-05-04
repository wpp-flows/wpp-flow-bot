import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { authService } from '@/services/authService';
import { useAuthStore } from '@/stores/authStore';
import { queryKeys } from '@/lib/queryClient';
import type { LoginCredentials } from '@/types';

export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const status = useAuthStore((s) => s.status);
  const setSession = useAuthStore((s) => s.setSession);
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const signOut = useAuthStore((s) => s.signOut);

  useEffect(() => {
    if (status === 'idle') bootstrap();
  }, [status, bootstrap]);

  const login = useMutation({
    mutationFn: (credentials: LoginCredentials) => authService.login(credentials),
    onSuccess: (session) => setSession(session.user, session.token),
  });

  return {
    user,
    status,
    isAuthenticated: status === 'authenticated',
    login,
    signOut,
  };
}

export function useMe() {
  return useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: () => authService.me(),
  });
}
