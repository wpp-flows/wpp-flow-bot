import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BadgePercent, Plus } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { couponService } from '@/services/couponService';
import { invalidateQueriesByFilters, queryKeys } from '@/lib/queryClient';
import { toast } from '@/stores/uiStore';
import type { Coupon, CouponInput } from '@/types';
import { CouponForm } from './components/CouponForm';
import { CouponRow } from './components/CouponRow';
import {
  buildCouponPayload,
  buildFormFromCoupon,
  emptyCouponForm,
  validateCouponForm,
  type CouponFormState,
} from './helpers/coupons-helpers';

export function CouponsPage() {
  const qc = useQueryClient();
  const couponsQ = useQuery({
    queryKey: queryKeys.coupons.all,
    queryFn: couponService.list,
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [form, setForm] = useState<CouponFormState>(emptyCouponForm);

  const invalidate = () =>
    invalidateQueriesByFilters(qc, [{ queryKey: queryKeys.coupons.all }]);

  const create = useMutation({
    mutationFn: (payload: CouponInput) => couponService.create(payload),
    onSuccess: () => {
      void invalidate();
      toast.success('Cupom criado');
      setModalOpen(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Falha ao criar'),
  });

  const update = useMutation({
    mutationFn: (input: { id: string; data: Partial<CouponInput> }) =>
      couponService.update(input.id, input.data),
    onSuccess: () => {
      void invalidate();
      toast.success('Cupom atualizado');
      setModalOpen(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Falha ao atualizar'),
  });

  const remove = useMutation({
    mutationFn: couponService.remove,
    onSuccess: () => {
      void invalidate();
      toast.success('Cupom excluído');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Falha ao excluir'),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyCouponForm);
    setModalOpen(true);
  };

  const openEdit = (coupon: Coupon) => {
    setEditing(coupon);
    setForm(buildFormFromCoupon(coupon));
    setModalOpen(true);
  };

  const onSubmit = () => {
    const validation = validateCouponForm(form);
    if (!validation.ok) {
      toast.error(validation.error);
      return;
    }
    const payload = buildCouponPayload(form);
    if (editing) update.mutate({ id: editing.id, data: payload });
    else create.mutate(payload);
  };

  const coupons = couponsQ.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Cupons"
        description="Crie códigos promocionais que o cliente pode aplicar no checkout do cardápio digital."
        actions={
          <Button leftIcon={<Plus />} onClick={openCreate}>
            Novo cupom
          </Button>
        }
      />

      {couponsQ.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : coupons.length === 0 ? (
        <EmptyState
          icon={<BadgePercent />}
          title="Nenhum cupom ainda"
          description='Crie um cupom como "BEMVINDO10" — desconto de 10% para o primeiro pedido.'
          action={
            <Button leftIcon={<Plus />} onClick={openCreate}>
              Criar primeiro cupom
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {coupons.map((coupon) => (
            <CouponRow
              key={coupon.id}
              coupon={coupon}
              onEdit={() => openEdit(coupon)}
              onDelete={() => remove.mutate(coupon.id)}
            />
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar cupom' : 'Novo cupom'}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              loading={create.isPending || update.isPending}
              onClick={onSubmit}
            >
              {editing ? 'Salvar alterações' : 'Criar cupom'}
            </Button>
          </>
        }
      >
        <CouponForm form={form} setForm={setForm} />
      </Modal>
    </div>
  );
}
