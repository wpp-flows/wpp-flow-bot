import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Banknote,
  Bike,
  CreditCard,
  ShoppingCart,
  Sparkles,
  Store,
  Tag,
  X,
} from 'lucide-react';
import {
  Controller,
  FormProvider,
  useForm,
  useFormContext,
} from 'react-hook-form';
import { ApiError } from '@/instances/api';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { cn } from '@/lib/utils';
import {
  publicCheckoutSchema,
  type PublicCheckoutFormValues,
} from '@/lib/schemas';
import { publicMenuService } from '@/services/publicMenuService';
import type {
  CustomerContextBanner,
  PublicCartSelectedOption,
  ValidatedCoupon,
} from '@/types/publicMenu';

function groupSelectionsByGroupId(
  selectedOptions: PublicCartSelectedOption[],
): { groupId: string; optionIds: string[] }[] {
  const byGroup = new Map<string, string[]>();
  for (const o of selectedOptions) {
    const arr = byGroup.get(o.groupId) ?? [];
    arr.push(o.optionId);
    byGroup.set(o.groupId, arr);
  }
  return Array.from(byGroup, ([groupId, optionIds]) => ({ groupId, optionIds }));
}
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { usePublicCart } from '../hooks/usePublicCart';
import {
  buildDeliveryAddress,
  formatBrl,
  readAutofillFromQuery,
} from '@/helpers/public-menu-helpers';

interface Props {
  slug: string;
  queryString: string;
  deliveryFee: number;
  isOpen: boolean;
  onBrowseMenu: () => void;
}

const checkoutDefaultValues: PublicCheckoutFormValues = {
  name: '',
  phone: '',
  addressStreet: '',
  addressNumber: '',
  addressNeighborhood: '',
  addressNotes: '',
  observation: '',
  deliveryMode: 'DELIVERY',
  couponCode: '',
  paymentMethod: 'MERCADOPAGO',
  cashChangeFor: '',
};

export function CheckoutTab({
  slug,
  queryString,
  deliveryFee: orgDeliveryFee,
  isOpen,
  onBrowseMenu,
}: Readonly<Props>) {
  const cart = usePublicCart(slug);
  const autofill = useMemo(() => readAutofillFromQuery(queryString), [queryString]);

  const [coupon, setCoupon] = useState<ValidatedCoupon | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  const form = useForm<PublicCheckoutFormValues>({
    resolver: zodResolver(publicCheckoutSchema),
    defaultValues: {
      ...checkoutDefaultValues,
      name: autofill.name,
      phone: autofill.phone,
    },
    mode: 'onSubmit',
  });

  const { handleSubmit, watch, setValue, getValues } = form;
  const deliveryMode = watch('deliveryMode');
  const paymentMethod = watch('paymentMethod');
  const phone = watch('phone');
  const couponCode = watch('couponCode');

  useEffect(() => {
    if (autofill.name) {
      const current = getValues('name');
      if (!current) setValue('name', autofill.name);
    }
    if (autofill.phone) {
      const current = getValues('phone');
      if (!current) setValue('phone', autofill.phone);
    }
  }, [autofill.name, autofill.phone, getValues, setValue]);

  const deliveryFee = deliveryMode === 'DELIVERY' ? orgDeliveryFee : 0;
  const couponDiscount = coupon?.discount ?? 0;
  const total = Math.max(0, cart.subtotal - couponDiscount) + deliveryFee;

  const debouncedPhone = useDebouncedValue(phone.trim(), 400);
  const customerContext = useQuery({
    queryKey: ['public-menu', slug, 'customer-context', debouncedPhone],
    queryFn: () => publicMenuService.getCustomerContext(slug, debouncedPhone),
    enabled: debouncedPhone.replace(/\D/g, '').length >= 8,
    staleTime: 60_000,
  });

  const validateCoupon = useMutation({
    mutationFn: () =>
      publicMenuService.validateCoupon(slug, couponCode.trim(), cart.subtotal),
    onSuccess: (validated) => {
      setCoupon(validated);
      setCouponError(null);
    },
    onError: (err) => {
      setCoupon(null);
      setCouponError(
        err instanceof ApiError ? err.message : 'Não foi possível validar o cupom.',
      );
    },
  });

  const mutation = useMutation({
    mutationFn: (values: PublicCheckoutFormValues) =>
      publicMenuService.createOrder(slug, {
        customer: { name: values.name.trim(), phone: values.phone.trim() },
        items: cart.items.map((it) => ({
          itemId: it.itemId,
          qty: it.qty,
          notes: it.notes ?? null,
          selections: groupSelectionsByGroupId(it.selectedOptions),
        })),
        observation: values.observation.trim() || null,
        address:
          values.deliveryMode === 'DELIVERY'
            ? buildDeliveryAddress({
              street: values.addressStreet,
              number: values.addressNumber,
              neighborhood: values.addressNeighborhood,
              notes: values.addressNotes,
            }) || null
            : null,
        deliveryMode: values.deliveryMode,
        couponCode: coupon?.code ?? null,
        paymentMethod: values.paymentMethod,
        cashChangeFor:
          values.paymentMethod === 'CASH' && values.cashChangeFor.trim()
            ? Number(values.cashChangeFor.replace(',', '.'))
            : null,
      }),
    onSuccess: (res, values) => {
      cart.clear();
      const successUrl = new URL(
        `/r/${slug}/pedido/${res.orderId}`,
        globalThis.location.origin,
      );
      if (values.phone) successUrl.searchParams.set('phone', values.phone);
      sessionStorage.setItem('mesa.public-checkout.return-url', successUrl.toString());
      globalThis.location.href = res.paymentLink;
    },
  });

  const onSubmit = (values: PublicCheckoutFormValues) => {
    if (!isOpen || cart.items.length === 0) return;
    mutation.mutate(values);
  };

  function removeCoupon() {
    setCoupon(null);
    setCouponError(null);
    setValue('couponCode', '');
  }

  const errorMessage =
    mutation.error instanceof ApiError
      ? mutation.error.message
      : mutation.isError
        ? 'Não foi possível criar o pedido. Tente novamente.'
        : null;

  if (cart.items.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-4 text-center">
        <ShoppingCart className="h-8 w-8 text-muted-foreground" />
        <h2 className="font-medium">Seu carrinho está vazio</h2>
        <p className="text-sm text-muted-foreground">
          Volte ao cardápio para adicionar itens.
        </p>
        <Button onClick={onBrowseMenu}>Ver cardápio</Button>
      </div>
    );
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <CustomerBanners banners={customerContext.data?.banners ?? []} />
        <DeliveryModeSection orgDeliveryFee={orgDeliveryFee} />
        <CustomerSection />
        <PaymentMethodSection />
        <CouponSection
          coupon={coupon}
          couponError={couponError}
          applying={validateCoupon.isPending}
          onApply={() => validateCoupon.mutate()}
          onRemove={removeCoupon}
        />
        <SummarySection
          subtotal={cart.subtotal}
          couponDiscount={couponDiscount}
          couponCode={coupon?.code ?? null}
          deliveryFee={deliveryFee}
          total={total}
        />

        {errorMessage ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {errorMessage}
          </div>
        ) : null}

        <div aria-hidden className="h-20" />
        <div className="fixed inset-x-0 bottom-[calc(theme(spacing.16)+env(safe-area-inset-bottom))] z-20 px-4">
          <div className="mx-auto max-w-3xl">
            <Button
              type="submit"
              size="lg"
              className="w-full shadow-soft-lg"
              loading={mutation.isPending}
              disabled={!isOpen}
            >
              {!isOpen
                ? 'Restaurante fechado'
                : paymentMethod === 'CASH'
                  ? `Confirmar pedido — ${formatBrl(total)}`
                  : `Pagar — ${formatBrl(total)}`}
            </Button>
          </div>
        </div>
      </form>
    </FormProvider>
  );
}

function CustomerSection() {
  const {
    register,
    formState: { errors },
  } = useFormContext<PublicCheckoutFormValues>();

  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-soft-sm">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Seus dados
      </h2>
      <div className="space-y-4">
        <FormField
          label="Nome"
          htmlFor="checkout-name"
          error={errors.name?.message}
          required
        >
          <Input
            id="checkout-name"
            invalid={!!errors.name}
            placeholder="Como devemos te chamar?"
            {...register('name')}
          />
        </FormField>
        <FormField
          label="WhatsApp"
          htmlFor="checkout-phone"
          error={errors.phone?.message}
          required
        >
          <Input
            id="checkout-phone"
            type="tel"
            invalid={!!errors.phone}
            placeholder="+55 19 9 9999-9999"
            {...register('phone')}
          />
        </FormField>
      </div>
    </section>
  );
}

function DeliveryModeSection({ orgDeliveryFee }: { orgDeliveryFee: number }) {
  const {
    register,
    control,
    watch,
    formState: { errors },
  } = useFormContext<PublicCheckoutFormValues>();
  const deliveryMode = watch('deliveryMode');

  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-soft-sm">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Como você quer receber?
      </h2>
      <Controller
        name="deliveryMode"
        control={control}
        render={({ field }) => (
          <div className="grid grid-cols-2 gap-3">
            <DeliveryModeOption
              active={field.value === 'DELIVERY'}
              icon={<Bike className="h-5 w-5" />}
              label="Entrega"
              hint={
                orgDeliveryFee > 0 ? `Taxa: ${formatBrl(orgDeliveryFee)}` : 'Entrega grátis'
              }
              onClick={() => field.onChange('DELIVERY')}
            />
            <DeliveryModeOption
              active={field.value === 'PICKUP'}
              icon={<Store className="h-5 w-5" />}
              label="Retirar no local"
              hint="Sem taxa"
              onClick={() => field.onChange('PICKUP')}
            />
          </div>
        )}
      />

      {deliveryMode === 'DELIVERY' ? (
        <div className="mt-4 space-y-4">
          <p className="text-sm font-medium">Endereço de entrega</p>
          <FormField
            label="Bairro"
            htmlFor="checkout-neighborhood"
            error={errors.addressNeighborhood?.message}
            required
          >
            <Input
              id="checkout-neighborhood"
              invalid={!!errors.addressNeighborhood}
              placeholder="Centro, Vila Mariana…"
              {...register('addressNeighborhood')}
            />
          </FormField>
          <div className="grid grid-cols-[1fr_5.5rem] gap-3">
            <FormField
              label="Rua"
              htmlFor="checkout-street"
              error={errors.addressStreet?.message}
              required
            >
              <Input
                id="checkout-street"
                invalid={!!errors.addressStreet}
                placeholder="Avenida Brasil"
                {...register('addressStreet')}
              />
            </FormField>
            <FormField
              label="Número"
              htmlFor="checkout-number"
              error={errors.addressNumber?.message}
              required
            >
              <Input
                id="checkout-number"
                invalid={!!errors.addressNumber}
                placeholder="120"
                {...register('addressNumber')}
              />
            </FormField>
          </div>
          <FormField
            label="Observações do endereço (opcional)"
            htmlFor="checkout-address-notes"
          >
            <Textarea
              id="checkout-address-notes"
              rows={2}
              placeholder="Apartamento, bloco, ponto de referência…"
              {...register('addressNotes')}
            />
          </FormField>
        </div>
      ) : null}

      <FormField
        className="mt-4"
        label="Observações do pedido (opcional)"
        htmlFor="checkout-observation"
        error={errors.observation?.message}
      >
        <Textarea
          id="checkout-observation"
          rows={2}
          placeholder="Algum detalhe geral sobre o pedido…"
          {...register('observation')}
        />
      </FormField>
    </section>
  );
}

function DeliveryModeOption({
  active,
  icon,
  label,
  hint,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition',
        active
          ? 'border-primary bg-primary/5 ring-1 ring-primary'
          : 'border-border bg-background hover:bg-muted/40',
      )}
    >
      <span className={cn(active ? 'text-primary' : 'text-muted-foreground')}>
        {icon}
      </span>
      <span className="text-sm font-medium">{label}</span>
      <span className="text-2xs text-muted-foreground">{hint}</span>
    </button>
  );
}

function PaymentMethodSection() {
  const {
    register,
    control,
    watch,
    formState: { errors },
  } = useFormContext<PublicCheckoutFormValues>();
  const paymentMethod = watch('paymentMethod');

  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-soft-sm">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Forma de pagamento
      </h2>
      <Controller
        name="paymentMethod"
        control={control}
        render={({ field }) => (
          <div className="grid grid-cols-2 gap-3">
            <PaymentMethodOption
              active={field.value === 'MERCADOPAGO'}
              icon={<CreditCard className="h-5 w-5" />}
              label="Pagar agora"
              hint="Cartão ou Pix via Mercado Pago"
              onClick={() => field.onChange('MERCADOPAGO')}
            />
            <PaymentMethodOption
              active={field.value === 'CASH'}
              icon={<Banknote className="h-5 w-5" />}
              label="Dinheiro"
              hint="Pagar na entrega"
              onClick={() => field.onChange('CASH')}
            />
          </div>
        )}
      />

      {paymentMethod === 'CASH' ? (
        <FormField
          className="mt-4"
          label="Precisa de troco? (opcional)"
          htmlFor="checkout-cash-change"
          error={errors.cashChangeFor?.message}
          hint="Informe a nota que vai entregar. Ex.: 50 para pagar com uma nota de R$ 50."
        >
          <Input
            id="checkout-cash-change"
            type="text"
            inputMode="decimal"
            placeholder="Ex.: 50"
            invalid={!!errors.cashChangeFor}
            {...register('cashChangeFor')}
          />
        </FormField>
      ) : null}
    </section>
  );
}

function PaymentMethodOption({
  active,
  icon,
  label,
  hint,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition',
        active
          ? 'border-primary bg-primary/5 ring-1 ring-primary'
          : 'border-border bg-background hover:bg-muted/40',
      )}
    >
      <span className={cn(active ? 'text-primary' : 'text-muted-foreground')}>
        {icon}
      </span>
      <span className="text-sm font-medium">{label}</span>
      <span className="text-2xs text-muted-foreground">{hint}</span>
    </button>
  );
}

function CouponSection({
  coupon,
  couponError,
  applying,
  onApply,
  onRemove,
}: {
  coupon: ValidatedCoupon | null;
  couponError: string | null;
  applying: boolean;
  onApply: () => void;
  onRemove: () => void;
}) {
  const { register, watch } = useFormContext<PublicCheckoutFormValues>();
  const couponCode = watch('couponCode');

  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-soft-sm">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        <Tag className="h-4 w-4" />
        Cupom de desconto
      </h2>
      {coupon ? (
        <div className="flex items-center justify-between gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900/40 dark:bg-emerald-950/30">
          <div>
            <p className="font-mono text-sm font-semibold text-emerald-900 dark:text-emerald-100">
              {coupon.code}
            </p>
            <p className="text-xs text-emerald-800 dark:text-emerald-200">
              {coupon.discountType === 'PERCENT'
                ? `${Number(coupon.discountValue).toFixed(0)}% de desconto`
                : `${formatBrl(coupon.discountValue)} de desconto`}{' '}
              · economiza {formatBrl(coupon.discount)}
            </p>
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-emerald-900 hover:bg-emerald-100 dark:text-emerald-100 dark:hover:bg-emerald-900/50"
            aria-label="Remover cupom"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Input
            id="checkout-coupon"
            placeholder="Digite o código"
            className="font-mono"
            {...register('couponCode', {
              setValueAs: (v) => String(v ?? '').toUpperCase(),
            })}
          />
          <Button
            type="button"
            variant="outline"
            loading={applying}
            disabled={!couponCode.trim()}
            onClick={onApply}
          >
            Aplicar
          </Button>
        </div>
      )}
      {couponError ? (
        <p className="mt-2 text-xs text-destructive">{couponError}</p>
      ) : null}
    </section>
  );
}

function SummarySection({
  subtotal,
  couponDiscount,
  couponCode,
  deliveryFee,
  total,
}: {
  subtotal: number;
  couponDiscount: number;
  couponCode: string | null;
  deliveryFee: number;
  total: number;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-soft-sm">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Resumo
      </h2>
      <dl className="space-y-1.5 text-sm">
        <Row label="Subtotal" value={formatBrl(subtotal)} />
        {couponDiscount > 0 ? (
          <Row
            label={couponCode ? `Cupom ${couponCode}` : 'Cupom'}
            value={`− ${formatBrl(couponDiscount)}`}
            tone="positive"
          />
        ) : null}
        <Row
          label="Entrega"
          value={deliveryFee > 0 ? formatBrl(deliveryFee) : 'Grátis'}
        />
        <Row label="Total" value={formatBrl(total)} bold />
      </dl>
    </section>
  );
}

function Row({
  label,
  value,
  bold,
  tone,
}: {
  label: string;
  value: string;
  bold?: boolean;
  tone?: 'positive';
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3',
        bold && 'pt-1 text-base font-semibold',
      )}
    >
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          'tabular-nums',
          tone === 'positive' && 'text-emerald-600 dark:text-emerald-400',
          bold && 'text-foreground',
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function CustomerBanners({ banners }: { banners: CustomerContextBanner[] }) {
  if (banners.length === 0) return null;
  return (
    <section className="space-y-2">
      {banners.map((banner) => (
        <div
          key={banner.promotionId}
          className={cn(
            'flex items-start gap-3 rounded-lg border p-3 text-sm',
            banner.kind === 'QUALIFYING'
              ? 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-100'
              : 'border-primary/30 bg-primary/5 text-foreground',
          )}
        >
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="whitespace-pre-line">{banner.message}</p>
        </div>
      ))}
    </section>
  );
}
