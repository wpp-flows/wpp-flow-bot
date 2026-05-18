import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Bot, Eye, EyeOff, Lock, Mail, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { Switch } from '@/components/ui/Switch';
import { loginSchema, type LoginFormValues } from '@/lib/schemas';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES, APP_CONFIG } from '@/constants/app';
import { toast } from '@/stores/uiStore';
import { ApiError } from '@/instances/api';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [showPwd, setShowPwd] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: 'demo@famigliarossi.com.br',
      password: 'pizzaria2026',
      remember: true,
    },
  });

  const remember = watch('remember');

  const onSubmit = async (values: LoginFormValues) => {
    try {
      await login.mutateAsync(values);
      toast.success('Bem-vindo de volta', `Conectado como ${values.email}`);
      const redirectTo = (location.state as { from?: { pathname?: string } })?.from?.pathname;
      navigate(redirectTo ?? ROUTES.dashboard, { replace: true });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Nao foi possivel entrar. Tente novamente.';
      toast.error('Falha ao entrar', message);
    }
  };

  return (
    <div className="grid w-full max-w-5xl grid-cols-1 overflow-hidden rounded-2xl border border-border bg-card shadow-soft-lg lg:grid-cols-[1.05fr_0.95fr]">
      {/* Left — visual panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/80 p-10 text-primary-foreground lg:flex">
        <div className="absolute inset-0 opacity-30 mix-blend-overlay" aria-hidden>
          <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-white/30 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-black/20 blur-3xl" />
          <div className="absolute inset-0 grid-pattern opacity-20" />
        </div>
        <div className="relative flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/30 backdrop-blur">
            <Bot className="h-5 w-5" />
          </span>
          <span className="text-base font-semibold tracking-tight">{APP_CONFIG.name}</span>
        </div>

        <div className="relative space-y-6">
          <p className="max-w-md text-3xl font-semibold leading-tight tracking-tight text-balance">
            Crie, publique e gerencie chatbots do WhatsApp para o seu restaurante - sem escrever uma linha de codigo.
          </p>

          <div className="grid grid-cols-3 gap-4 max-w-md">
            {[
              { v: '4.2×', l: 'pedidos / dia' },
              { v: '38s', l: 'tempo medio' },
              { v: '99.9%', l: 'disponibilidade' },
            ].map((stat) => (
              <div
                key={stat.l}
                className="rounded-lg border border-white/15 bg-white/10 p-3 backdrop-blur"
              >
                <p className="text-xl font-semibold tracking-tight">{stat.v}</p>
                <p className="mt-0.5 text-2xs uppercase tracking-wider text-white/70">{stat.l}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <blockquote className="text-sm text-white/85 max-w-md">
            "Trocamos duas horas de atendimentos noturnos por um flow Mesa. A equipe agora consegue servir de verdade."
          </blockquote>
          <p className="mt-2 text-xs text-white/70">— Andrea Romano, Proprietaria · Forno Romano</p>
        </div>
      </div>

      {/* Right — form panel */}
      <div className="flex flex-col gap-8 p-8 sm:p-10">
        <div className="flex items-center gap-2.5 lg:hidden">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Bot className="h-5 w-5" />
          </span>
          <span className="text-base font-semibold tracking-tight">{APP_CONFIG.name}</span>
        </div>

        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Entre no seu painel
          </h1>
          <p className="text-sm text-muted-foreground">
            Gerencie flows, menus e conversas em todos os seus restaurantes.
          </p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <FormField
            label="Email"
            htmlFor="email"
            error={errors.email?.message}
            required
          >
            <Input
              id="email"
              type="email"
              autoComplete="email"
              leftIcon={<Mail />}
              invalid={!!errors.email}
              placeholder="voce@restaurante.com"
              {...register('email')}
            />
          </FormField>

          <FormField
            label="Password"
            htmlFor="password"
            error={errors.password?.message}
            required
          >
            <Input
              id="password"
              type={showPwd ? 'text' : 'password'}
              autoComplete="current-password"
              leftIcon={<Lock />}
              rightIcon={
                <button
                  type="button"
                  className="pointer-events-auto inline-flex items-center justify-center rounded-md p-0.5 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPwd((v) => !v)}
                  aria-label={showPwd ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
              invalid={!!errors.password}
              placeholder="••••••••"
              {...register('password')}
            />
          </FormField>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground">
              <Switch
                size="sm"
                checked={!!remember}
                onChange={(e) => setValue('remember', e.target.checked, { shouldDirty: true })}
              />
              Manter conectado
            </label>
            <Link
              to="#"
              className="text-xs font-medium text-primary hover:underline underline-offset-4"
            >
              Esqueceu a senha?
            </Link>
          </div>

          <Button
            type="submit"
            size="lg"
            loading={isSubmitting || login.isPending}
            rightIcon={<ArrowRight />}
            className="mt-2"
          >
            Entrar
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Novo no {APP_CONFIG.name}?{' '}
            <Link to={ROUTES.signUp} className="font-medium text-primary hover:underline underline-offset-4">
              Criar um workspace
            </Link>
          </p>
        </form>

        <div className="mt-auto rounded-lg border border-dashed border-border bg-muted/40 p-3 text-2xs text-muted-foreground">
          <p className="font-semibold text-foreground">Credenciais de demo</p>
          <p className="mt-0.5 font-mono text-foreground/80">demo@bellini.com · mesademo2026</p>
        </div>
      </div>
    </div>
  );
}
