import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Bike, ShoppingCart, Sparkles, Store, Tag, X } from 'lucide-react';
import { ApiError } from '@/instances/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { cn } from '@/lib/utils';
import { publicMenuService } from '@/services/publicMenuService';
import type {
  CustomerContextBanner,
  PublicDeliveryMode,
  ValidatedCoupon,
} from '@/types/publicMenu';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { usePublicCart } from '../hooks/usePublicCart';
import { formatBrl, readAutofillFromQuery } from '@/helpers/public-menu-helpers';

interface FormState {
  name: string;
  phone: string;
  address: string;
  observation: string;
  deliveryMode: PublicDeliveryMode;
  couponCode: string;
}

interface Props {
  slug: string;
  queryString: string;
  deliveryFee: number;
  isOpen: boolean;
  onBrowseMenu: () => void;
}

export function CheckoutTab({
  slug,
  queryString,
  deliveryFee: orgDeliveryFee,
  isOpen,
  onBrowseMenu,
}: Readonly<Props>) {
  const cart = usePublicCart(slug);

  const autofill = useMemo(() => readAutofillFromQuery(queryString), [queryString]);

  const [form, setForm] = useState<FormState>(() => ({
    name: autofill.name,
    phone: autofill.phone,
    address: '',
    observation: '',
    deliveryMode: 'DELIVERY',
    couponCode: '',
  }));
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [coupon, setCoupon] = useState<ValidatedCoupon | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  useEffect(() => {
    setForm((f) => ({
      ...f,
      name: f.name || autofill.name,
      phone: f.phone || autofill.phone,
    }));
  }, [autofill.name, autofill.phone]);

  const deliveryFee = form.deliveryMode === 'DELIVERY' ? orgDeliveryFee : 0;
  const couponDiscount = coupon?.discount ?? 0;
  const total = Math.max(0, cart.subtotal - couponDiscount) + deliveryFee;

  const debouncedPhone = useDebouncedValue(form.phone.trim(), 400);
  const customerContext = useQuery({
    queryKey: ['public-menu', slug, 'customer-context', debouncedPhone],
    queryFn: () => publicMenuService.getCustomerContext(slug, debouncedPhone),
    enabled: debouncedPhone.replace(/\D/g, '').length >= 8,
    staleTime: 60_000,
  });

  const validateCoupon = useMutation({
    mutationFn: () =>
      publicMenuService.validateCoupon(slug, form.couponCode.trim(), cart.subtotal),
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
    mutationFn: () =>
      publicMenuService.createOrder(slug, {
        customer: { name: form.name.trim(), phone: form.phone.trim() },
        items: cart.items.map((it) => ({
          itemId: it.itemId,
          qty: it.qty,
          notes: it.notes ?? null,
          additionals: it.additionals.map((a) => ({
            id: a.id,
            name: a.name,
            price: Number.parseFloat(a.price || '0'),
          })),
          bundle: it.bundle
            ? {
              bundleId: it.bundle.bundleId,
              picks: it.bundle.picks.map((p) => ({
                componentId: p.componentId,
                itemId: p.itemId,
              })),
              answers: it.bundle.answers,
            }
            : null,
        })),
        observation: form.observation.trim() || null,
        address: form.deliveryMode === 'DELIVERY' ? form.address.trim() || null : null,
        deliveryMode: form.deliveryMode,
        couponCode: coupon?.code ?? null,
      }),
    onSuccess: (res) => {
      cart.clear();
      const successUrl = new URL(
        `/r/${slug}/pedido/${res.orderId}`,
        globalThis.location.origin,
      );
      if (form.phone) successUrl.searchParams.set('phone', form.phone);
      sessionStorage.setItem('mesa.public-checkout.return-url', successUrl.toString());
      globalThis.location.href = res.paymentLink;
    },
  });

  function validate(): boolean {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) next.name = 'Informe seu nome.';
    if (!form.phone.trim()) next.phone = 'Informe seu telefone.';
    if (form.deliveryMode === 'DELIVERY' && !form.address.trim()) {
      next.address = 'Informe o endereço de entrega.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isOpen) return;
    if (cart.items.length === 0) return;
    if (!validate()) return;
    mutation.mutate();
  }

  function removeCoupon() {
    setCoupon(null);
    setCouponError(null);
    setForm((f) => ({ ...f, couponCode: '' }));
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
    <form onSubmit={handleSubmit} className="space-y-5">
      <CustomerBanners banners={customerContext.data?.banners ?? []} />
      <DeliveryModeSection
        form={form}
        setForm={setForm}
        errors={errors}
        orgDeliveryFee={orgDeliveryFee}
      />
      <CustomerSection form={form} setForm={setForm} errors={errors} />
      <CouponSection
        form={form}
        setForm={setForm}
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
            {isOpen ? `Pagar — ${formatBrl(total)}` : 'Restaurante fechado'}
          </Button>
        </div>
      </div>
    </form>
  );
}

function CustomerSection({
  form,
  setForm,
  errors,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  errors: Partial<Record<keyof FormState, string>>;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-soft-sm">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Seus dados
      </h2>
      <div className="space-y-4">
        <div>
          <Label htmlFor="checkout-name">Nome</Label>
          <Input
            id="checkout-name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            invalid={!!errors.name}
            placeholder="Como devemos te chamar?"
          />
          {errors.name ? (
            <p className="mt-1 text-xs text-destructive">{errors.name}</p>
          ) : null}
        </div>
        <div>
          <Label htmlFor="checkout-phone">WhatsApp</Label>
          <Input
            id="checkout-phone"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            invalid={!!errors.phone}
            placeholder="+55 19 9 9999-9999"
            type="tel"
          />
          {errors.phone ? (
            <p className="mt-1 text-xs text-destructive">{errors.phone}</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function DeliveryModeSection({
  form,
  setForm,
  errors,
  orgDeliveryFee,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  errors: Partial<Record<keyof FormState, string>>;
  orgDeliveryFee: number;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-soft-sm">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Como você quer receber?
      </h2>
      <div className="grid grid-cols-2 gap-3">
        <DeliveryModeOption
          active={form.deliveryMode === 'DELIVERY'}
          icon={<Bike className="h-5 w-5" />}
          label="Entrega"
          hint={orgDeliveryFee > 0 ? `Taxa: ${formatBrl(orgDeliveryFee)}` : 'Entrega grátis'}
          onClick={() => setForm((f) => ({ ...f, deliveryMode: 'DELIVERY' }))}
        />
        <DeliveryModeOption
          active={form.deliveryMode === 'PICKUP'}
          icon={<Store className="h-5 w-5" />}
          label="Retirar no local"
          hint="Sem taxa"
          onClick={() => setForm((f) => ({ ...f, deliveryMode: 'PICKUP' }))}
        />
      </div>

      {form.deliveryMode === 'DELIVERY' ? (
        <div className="mt-4">
          <Label htmlFor="checkout-address">Endereço de entrega</Label>
          <Textarea
            id="checkout-address"
            rows={3}
            value={form.address}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            invalid={!!errors.address}
            placeholder="Rua, número, complemento, bairro…"
          />
          {errors.address ? (
            <p className="mt-1 text-xs text-destructive">{errors.address}</p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4">
        <Label htmlFor="checkout-observation">Observações do pedido (opcional)</Label>
        <Textarea
          id="checkout-observation"
          rows={2}
          value={form.observation}
          onChange={(e) => setForm((f) => ({ ...f, observation: e.target.value }))}
          placeholder="Algum detalhe geral sobre o pedido…"
        />
      </div>
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

function CouponSection({
  form,
  setForm,
  coupon,
  couponError,
  applying,
  onApply,
  onRemove,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  coupon: ValidatedCoupon | null;
  couponError: string | null;
  applying: boolean;
  onApply: () => void;
  onRemove: () => void;
}) {
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
            value={form.couponCode}
            onChange={(e) =>
              setForm((f) => ({ ...f, couponCode: e.target.value.toUpperCase() }))
            }
            placeholder="Digite o código"
            className="font-mono"
          />
          <Button
            type="button"
            variant="outline"
            loading={applying}
            disabled={!form.couponCode.trim()}
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
