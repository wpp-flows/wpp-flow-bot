import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Lock, Mail, User } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { signUpSchema, type SignUpFormValues } from '@/lib/schemas';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES, APP_CONFIG } from '@/constants/app';
import { toast } from '@/stores/uiStore';
import { ApiError } from '@/instances/api';

export function SignUpPage() {
  const navigate = useNavigate();
  const { signUp } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: '', email: '', password: '' },
  });

  const onSubmit = async (values: SignUpFormValues) => {
    try {
      await signUp.mutateAsync(values);
      toast.success('Account created', `Welcome, ${values.name}!`);
      navigate(ROUTES.onboarding, { replace: true });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Sign-up failed.';
      toast.error('Sign-up failed', message);
    }
  };

  return (
    <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-soft-lg sm:p-10">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Create your {APP_CONFIG.name} account</h1>
        <p className="text-sm text-muted-foreground">
          Sign up to start managing WhatsApp chatbots for your restaurant.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 flex flex-col gap-4" noValidate>
        <FormField label="Full name" htmlFor="signup-name" error={errors.name?.message} required>
          <Input
            id="signup-name"
            leftIcon={<User />}
            invalid={!!errors.name}
            placeholder="Marina Bellini"
            {...register('name')}
          />
        </FormField>

        <FormField label="Email" htmlFor="signup-email" error={errors.email?.message} required>
          <Input
            id="signup-email"
            type="email"
            autoComplete="email"
            leftIcon={<Mail />}
            invalid={!!errors.email}
            placeholder="you@restaurant.com"
            {...register('email')}
          />
        </FormField>

        <FormField label="Password" htmlFor="signup-password" error={errors.password?.message} required>
          <Input
            id="signup-password"
            type="password"
            autoComplete="new-password"
            leftIcon={<Lock />}
            invalid={!!errors.password}
            placeholder="At least 8 characters"
            {...register('password')}
          />
        </FormField>

        <Button
          type="submit"
          size="lg"
          loading={isSubmitting || signUp.isPending}
          rightIcon={<ArrowRight />}
          className="mt-2"
        >
          Create account
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          Already have an account?{' '}
          <Link to={ROUTES.login} className="font-medium text-primary hover:underline underline-offset-4">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
