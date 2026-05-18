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
    queryKey: queryKeys.menu.items,
    queryFn: menuService.listItems,
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
    });
    setModalOpen(true);
  };

  const onSubmit = () => {
    const promoPriceRaw = form.promotionalPrice.replace(',', '.').trim();
    const promoPrice = promoPriceRaw ? Number.parseFloat(promoPriceRaw) : null;
    const payload: PromotionInput = {
      kind: form.kind,
      name: form.name.trim(),
      isActive: form.isActive,
      nthOrder:
        form.kind === 'NTH_ORDER_DISCOUNT' ? Number.parseInt(form.nthOrder, 10) : null,
      discountType: form.kind === 'NTH_ORDER_DISCOUNT' ? form.discountType : null,
      discountValue:
        form.kind === 'NTH_ORDER_DISCOUNT'
          ? Number.parseFloat(form.discountValue.replace(',', '.'))
          : null,
      daysOfWeek: form.kind === 'DAILY_MESSAGE' ? form.daysOfWeek : [],
      message: form.kind === 'DAILY_MESSAGE' ? form.message.trim() : null,
      featuredItemId:
        form.kind === 'DAILY_MESSAGE' && form.featuredItemId
          ? form.featuredItemId
          : null,
      promotionalPrice:
        form.kind === 'DAILY_MESSAGE' &&
        form.featuredItemId &&
        promoPrice != null &&
        Number.isFinite(promoPrice)
          ? promoPrice
          : null,
      teaserOrderOffset:
        form.kind === 'NTH_ORDER_DISCOUNT' && form.teaserOrderOffset
          ? Number.parseInt(form.teaserOrderOffset, 10)
          : null,
      teaserMessage:
        form.kind === 'NTH_ORDER_DISCOUNT' && form.teaserMessage.trim()
          ? form.teaserMessage.trim()
          : null,
    };
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
