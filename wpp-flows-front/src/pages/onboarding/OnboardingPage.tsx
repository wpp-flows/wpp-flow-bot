import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Store } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import {
  organizationOnboardingSchema,
  type OrganizationOnboardingFormValues,
} from '@/lib/schemas';
import { authService } from '@/services/authService';
import { useAuthStore } from '@/stores/authStore';
import { ROUTES, APP_CONFIG } from '@/constants/app';
import { toast } from '@/stores/uiStore';
import { ApiError } from '@/instances/api';

export function OnboardingPage() {
  const navigate = useNavigate();
  const refreshOrganization = useAuthStore((s) => s.refreshOrganization);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<OrganizationOnboardingFormValues>({
    resolver: zodResolver(organizationOnboardingSchema),
    defaultValues: { name: '', slug: '' },
  });

  const createOrg = useMutation({
    mutationFn: (values: OrganizationOnboardingFormValues) =>
      authService.createOrganization({
        name: values.name,
        slug: values.slug || undefined,
      }),
    onSuccess: async (org) => {
      await refreshOrganization();
      toast.success('Restaurante criado', `${org.name} esta pronto.`);
      navigate(ROUTES.dashboard, { replace: true });
    },
    onError: (err: Error) => {
      const message = err instanceof ApiError ? err.message : 'Nao foi possivel criar.';
      toast.error('Falha na configuracao', message);
    },
  });

  return (
    <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-soft-lg sm:p-10">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Store className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Configure seu restaurante</h1>
          <p className="text-xs text-muted-foreground">
            Etapa final antes de usar {APP_CONFIG.name}.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit((v) => createOrg.mutate(v))}
        className="mt-6 flex flex-col gap-4"
        noValidate
      >
        <FormField
          label="Nome do restaurante"
          htmlFor="org-name"
          error={errors.name?.message}
          required
        >
          <Input
            id="org-name"
            invalid={!!errors.name}
            placeholder="Trattoria Bellini"
            {...register('name')}
          />
        </FormField>

        <FormField
          label="Slug (opcional)"
          htmlFor="org-slug"
          error={errors.slug?.message}
          hint="Usado em URLs publicas. Gerado automaticamente do nome se ficar em branco."
        >
          <Input
            id="org-slug"
            invalid={!!errors.slug}
            placeholder="trattoria-bellini"
            {...register('slug')}
          />
        </FormField>

        <Button
          type="submit"
          size="lg"
          loading={isSubmitting || createOrg.isPending}
          rightIcon={<ArrowRight />}
          className="mt-2"
        >
          Continuar
        </Button>
      </form>
    </div>
  );
}
