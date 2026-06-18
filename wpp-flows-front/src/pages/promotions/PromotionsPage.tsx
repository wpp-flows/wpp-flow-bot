import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, TicketPercent } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
import { menuService } from '@/services/menuService';
import { promotionService } from '@/services/promotionService';
import { invalidateQueriesByFilters, queryKeys } from '@/lib/queryClient';
import { toast } from '@/stores/uiStore';
import type { Promotion, PromotionInput } from '@/types';
import { PromotionForm } from './components/PromotionForm';
import { PromotionRow } from './components/PromotionRow';
import {
  emptyPromotionForm,
  type PromotionFormState,
} from './promotions-constants';

export function PromotionsPage() {
  const qc = useQueryClient();
  const promotionsQ = useQuery({
    queryKey: queryKeys.promotions.all,
    queryFn: promotionService.list,
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [form, setForm] = useState<PromotionFormState>(emptyPromotionForm);

  const menuItemsQ = useQuery({
    queryKey: queryKeys.menu.items('DELIVERY'),
    queryFn: () => menuService.listItems({ serviceType: 'DELIVERY' }),
  });

  const invalidate = () =>
    invalidateQueriesByFilters(qc, [{ queryKey: queryKeys.promotions.all }]);

  const create = useMutation({
    mutationFn: promotionService.create,
    onSuccess: () => {
      void invalidate();
      toast.success('Promoção criada');
      setModalOpen(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Falha ao criar'),
  });

  const update = useMutation({
    mutationFn: (input: { id: string; data: Partial<PromotionInput> }) =>
      promotionService.update(input.id, input.data),
    onSuccess: () => {
      void invalidate();
      toast.success('Promoção atualizada');
      setModalOpen(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Falha ao atualizar'),
  });

  const remove = useMutation({
    mutationFn: promotionService.remove,
    onSuccess: () => {
      void invalidate();
      toast.success('Promoção excluída');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Falha ao excluir'),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyPromotionForm);
    setModalOpen(true);
  };

  const openEdit = (promo: Promotion) => {
    setEditing(promo);
    setForm({
      kind: promo.kind,
      name: promo.name,
      isActive: promo.isActive,
      nthOrder: promo.nthOrder?.toString() ?? '',
      discountType: promo.discountType ?? 'PERCENT',
      discountValue: promo.discountValue ?? '',
      daysOfWeek: promo.daysOfWeek,
      message: promo.message ?? '',
      featuredItemId: promo.featuredItemId ?? '',
      promotionalPrice: promo.promotionalPrice ?? '',
      teaserOrderOffset: promo.teaserOrderOffset?.toString() ?? '',
      teaserMessage: promo.teaserMessage ?? '',
      qualifyingMessage: promo.qualifyingMessage ?? '',
      bundleComponents: promo.bundle?.components ?? [],
      bundlePrice: promo.bundle?.price ?? '',
      bundleQuestions: promo.bundle?.questions ?? [],
    });
    setModalOpen(true);
  };

  const onSubmit = () => {
    const payload = buildPayload(form);
    if (!payload.name) {
      toast.error('Informe um nome para a promoção.');
      return;
    }
    if (editing) update.mutate({ id: editing.id, data: payload });
    else create.mutate(payload);
  };

  const promotions = promotionsQ.data ?? [];
  const grouped = useMemo(
    () => ({
      discounts: promotions.filter((p) => p.kind === 'NTH_ORDER_DISCOUNT'),
      daily: promotions.filter((p) => p.kind === 'DAILY_MESSAGE'),
      bundles: promotions.filter((p) => p.kind === 'BUNDLE'),
    }),
    [promotions],
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Promoções"
        description="Crie regras de promoção que o bot aplica automaticamente: descontos no Nº pedido do cliente e mensagens diárias antes do menu."
        actions={
          <Button leftIcon={<Plus />} onClick={openCreate}>
            Nova promoção
          </Button>
        }
      />

      {promotionsQ.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : promotions.length === 0 ? (
        <EmptyState
          icon={<TicketPercent />}
          title="Nenhuma promoção ainda"
          description="Crie uma promoção do Nº pedido (ex: 10% no 5º pedido) ou uma promoção do dia."
          action={
            <Button leftIcon={<Plus />} onClick={openCreate}>
              Criar primeira promoção
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          <Section title="Descontos por nº de pedido">
            {grouped.discounts.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Nenhum desconto configurado.
              </p>
            ) : (
              <div className="space-y-2">
                {grouped.discounts.map((promo) => (
                  <PromotionRow
                    key={promo.id}
                    promo={promo}
                    onEdit={() => openEdit(promo)}
                    onDelete={() => remove.mutate(promo.id)}
                  />
                ))}
              </div>
            )}
          </Section>

          <Section title="Mensagens do dia">
            {grouped.daily.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Nenhuma mensagem do dia configurada.
              </p>
            ) : (
              <div className="space-y-2">
                {grouped.daily.map((promo) => (
                  <PromotionRow
                    key={promo.id}
                    promo={promo}
                    onEdit={() => openEdit(promo)}
                    onDelete={() => remove.mutate(promo.id)}
                  />
                ))}
              </div>
            )}
          </Section>

          <Section title="Combos">
            {grouped.bundles.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Nenhum combo configurado. Crie um para vender pacotes como "2 pizzas + refri grátis".
              </p>
            ) : (
              <div className="space-y-2">
                {grouped.bundles.map((promo) => (
                  <PromotionRow
                    key={promo.id}
                    promo={promo}
                    onEdit={() => openEdit(promo)}
                    onDelete={() => remove.mutate(promo.id)}
                  />
                ))}
              </div>
            )}
          </Section>
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar promoção' : 'Nova promoção'}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              loading={create.isPending || update.isPending}
              onClick={onSubmit}
            >
              {editing ? 'Salvar alterações' : 'Criar promoção'}
            </Button>
          </>
        }
      >
        <PromotionForm
          form={form}
          setForm={setForm}
          menuItems={menuItemsQ.data ?? []}
        />
      </Modal>
    </div>
  );
}

function Section(props: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold tracking-tight">{props.title}</h2>
      {props.children}
    </div>
  );
}

function buildPayload(form: PromotionFormState): PromotionInput {
  const base: PromotionInput = {
    kind: form.kind,
    name: form.name.trim(),
    isActive: form.isActive,
    nthOrder: null,
    discountType: null,
    discountValue: null,
    daysOfWeek: [],
    message: null,
    featuredItemId: null,
    promotionalPrice: null,
    teaserOrderOffset: null,
    teaserMessage: null,
    qualifyingMessage: null,
    bundle: null,
  };
  switch (form.kind) {
    case 'NTH_ORDER_DISCOUNT':
      return { ...base, ...buildNthOrderPayload(form) };
    case 'DAILY_MESSAGE':
      return { ...base, ...buildDailyMessagePayload(form) };
    case 'BUNDLE':
      return { ...base, ...buildBundlePayload(form) };
  }
}

function buildNthOrderPayload(form: PromotionFormState): Partial<PromotionInput> {
  return {
    nthOrder: Number.parseInt(form.nthOrder, 10),
    discountType: form.discountType,
    discountValue: Number.parseFloat(form.discountValue.replace(',', '.')),
    teaserOrderOffset: form.teaserOrderOffset
      ? Number.parseInt(form.teaserOrderOffset, 10)
      : null,
    teaserMessage: form.teaserMessage.trim() || null,
    qualifyingMessage: form.qualifyingMessage.trim() || null,
  };
}

function buildDailyMessagePayload(form: PromotionFormState): Partial<PromotionInput> {
  const promoPriceRaw = form.promotionalPrice.replace(',', '.').trim();
  const promoPrice = promoPriceRaw ? Number.parseFloat(promoPriceRaw) : null;
  const hasValidPrice = promoPrice != null && Number.isFinite(promoPrice);
  return {
    daysOfWeek: form.daysOfWeek,
    message: form.message.trim(),
    featuredItemId: form.featuredItemId || null,
    promotionalPrice:
      form.featuredItemId && hasValidPrice ? promoPrice : null,
  };
}

function buildBundlePayload(form: PromotionFormState): Partial<PromotionInput> {
  return {
    bundle: {
      components: form.bundleComponents,
      price: form.bundlePrice.replace(',', '.').trim() || '0',
      questions: form.bundleQuestions,
    },
  };
}
