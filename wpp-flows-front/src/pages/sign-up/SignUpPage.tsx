import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowRight, CheckCircle2, Lock, Mail, User } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  acceptInvitationSchema,
  type AcceptInvitationFormValues,
} from '@/lib/schemas';
import { invitationService } from '@/services/invitationService';
import { useAuthStore } from '@/stores/authStore';
import { authService } from '@/services/authService';
import { ROUTES, APP_CONFIG } from '@/constants/app';
import { toast } from '@/stores/uiStore';
import { ApiError } from '@/instances/api';

export function SignUpPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();
  const bootstrap = useAuthStore((s) => s.bootstrap);

  const tokenQ = useQuery({
    queryKey: ['invitation', token],
    queryFn: () => invitationService.validate(token),
    enabled: token.length > 0,
    staleTime: 60_000,
  });

  const form = useForm<AcceptInvitationFormValues>({
    resolver: zodResolver(acceptInvitationSchema),
    defaultValues: { name: '', password: '' },
  });

  const accept = useMutation({
    mutationFn: (values: AcceptInvitationFormValues) =>
      invitationService.accept({
        token,
        name: values.name,
        password: values.password,
      }),
    onSuccess: async (data, values) => {
      try {
        await authService.login({
          email: data.email,
          password: values.password,
        });
        await bootstrap();
        toast.success('Conta criada', `Bem-vindo, ${values.name}!`);
        navigate(ROUTES.onboarding, { replace: true });
      } catch (loginErr) {
        const msg =
          loginErr instanceof ApiError ? loginErr.message : 'Falha ao entrar.';
        toast.error('Conta criada, mas não consegui entrar', msg);
        navigate(ROUTES.login, { replace: true });
      }
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : 'Falha no cadastro.';
      toast.error('Falha no cadastro', msg);
    },
  });

  useEffect(() => {
    if (accept.isError) void tokenQ.refetch();
  }, [accept.isError, tokenQ]);

  if (!token) {
    return (
      <ErrorCard
        title="Convite ausente"
        body="Esta página é acessível somente via link de convite por e-mail."
      />
    );
  }

  if (tokenQ.isLoading) {
    return (
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-soft-lg sm:p-10">
        <div className="space-y-3">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="mt-4 h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  if (tokenQ.isError || !tokenQ.data?.valid || !tokenQ.data.email) {
    return (
      <ErrorCard
        title="Convite inválido ou expirado"
        body="Peça ao administrador para gerar um novo convite e tente novamente."
      />
    );
  }

  const invitedEmail = tokenQ.data.email;

  const onSubmit = (values: AcceptInvitationFormValues) => {
    accept.mutate(values);
  };

  return (
    <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-soft-lg sm:p-10">
      <div className="space-y-1">
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Convite válido
        </div>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">
          Crie sua conta {APP_CONFIG.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          Defina seu nome e senha para ativar a conta de{' '}
          <span className="font-medium text-foreground">{invitedEmail}</span>.
        </p>
      </div>

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="mt-6 flex flex-col gap-4"
        noValidate
      >
        <FormField label="Email" htmlFor="signup-email">
          <Input
            id="signup-email"
            type="email"
            leftIcon={<Mail />}
            value={invitedEmail}
            readOnly
            tabIndex={-1}
            className="cursor-not-allowed bg-muted/40"
          />
        </FormField>

        <FormField
          label="Nome completo"
          htmlFor="signup-name"
          error={form.formState.errors.name?.message}
          required
        >
          <Input
            id="signup-name"
            leftIcon={<User />}
            invalid={!!form.formState.errors.name}
            placeholder="Marina Bellini"
            {...form.register('name')}
          />
        </FormField>

        <FormField
          label="Senha"
          htmlFor="signup-password"
          error={form.formState.errors.password?.message}
          required
        >
          <Input
            id="signup-password"
            type="password"
            autoComplete="new-password"
            leftIcon={<Lock />}
            invalid={!!form.formState.errors.password}
            placeholder="Pelo menos 8 caracteres"
            {...form.register('password')}
          />
        </FormField>

        <Button
          type="submit"
          size="lg"
          loading={accept.isPending}
          rightIcon={<ArrowRight />}
          className="mt-2"
        >
          Criar conta
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          Já tem uma conta?{' '}
          <Link
            to={ROUTES.login}
            className="font-medium text-primary hover:underline underline-offset-4"
          >
            Entrar
          </Link>
        </p>
      </form>
    </div>
  );
}

function ErrorCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-soft-lg sm:p-10">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-destructive/15 p-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{body}</p>
        </div>
      </div>
      <div className="mt-6">
        <Link to={ROUTES.login} className="text-sm font-medium text-primary hover:underline">
          Voltar para o login
        </Link>
      </div>
    </div>
  );
}
