import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { authService } from '@/services/authService';
import { useAuthStore } from '@/stores/authStore';
import { queryKeys } from '@/lib/queryClient';
import type { LoginCredentials, SignUpCredentials } from '@/types';

export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const organization = useAuthStore((s) => s.organization);
  const status = useAuthStore((s) => s.status);
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const signOut = useAuthStore((s) => s.signOut);
  const refreshOrganization = useAuthStore((s) => s.refreshOrganization);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (status === 'idle') void bootstrap();
  }, [status, bootstrap]);

  const login = useMutation({
    mutationFn: (credentials: LoginCredentials) => authService.login(credentials),
    onSuccess: async () => {
      await bootstrap();
      await queryClient.invalidateQueries();
    },
  });

  const signUp = useMutation({
    mutationFn: (credentials: SignUpCredentials) => authService.signUp(credentials),
    onSuccess: async () => {
      await bootstrap();
      await queryClient.invalidateQueries();
    },
  });

  return {
    user,
    organization,
    status,
    isAuthenticated: status === 'authenticated',
    login,
    signUp,
    signOut,
    refreshOrganization,
  };
}

export function useMe() {
  return useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: () => authService.me(),
  });
}
