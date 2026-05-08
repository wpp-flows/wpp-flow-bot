import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { FormField } from '@/components/ui/FormField';
import { categorySchema, type CategoryFormValues } from '@/lib/schemas';
import { menuService } from '@/services/menuService';
import { invalidateQueriesByFilters, queryKeys } from '@/lib/queryClient';
import { toast } from '@/stores/uiStore';
import type { MenuCategory } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
  category?: MenuCategory | null;
}

export function CategoryFormModal({ open, onClose, category }: Props) {
  const qc = useQueryClient();
  const editing = Boolean(category);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: '', description: '' },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: category?.name ?? '',
        description: category?.description ?? '',
      });
    }
  }, [open, category, reset]);

  const create = useMutation({
    mutationFn: (v: CategoryFormValues) => menuService.createCategory(v),
    onSuccess: () => {
      void invalidateQueriesByFilters(qc, [{ queryKey: queryKeys.menu.categories }]);
      toast.success('Categoria adicionada');
      onClose();
    },
  });

  const update = useMutation({
    mutationFn: (v: CategoryFormValues) =>
      menuService.updateCategory({ id: category!.id, ...v }),
    onSuccess: () => {
      void invalidateQueriesByFilters(qc, [{ queryKey: queryKeys.menu.categories }]);
      toast.success('Categoria atualizada');
      onClose();
    },
  });

  const onSubmit = (values: CategoryFormValues) => {
    if (editing) update.mutate(values);
    else create.mutate(values);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Editar categoria' : 'Nova categoria'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="category-form"
            loading={isSubmitting || create.isPending || update.isPending}
          >
            {editing ? 'Salvar alteracoes' : 'Criar categoria'}
          </Button>
        </>
      }
    >
      <form
        id="category-form"
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4 py-1"
        noValidate
      >
        <FormField label="Nome" htmlFor="cat-name" error={errors.name?.message} required>
          <Input
            id="cat-name"
            placeholder="ex: Pizzas"
            invalid={!!errors.name}
            {...register('name')}
          />
        </FormField>
        <FormField
          label="Descricao"
          htmlFor="cat-desc"
          error={errors.description?.message}
        >
          <Textarea
            id="cat-desc"
            placeholder="Classicos no forno a lenha - subtitulo curto exibido aos clientes."
            invalid={!!errors.description}
            {...register('description')}
          />
        </FormField>
      </form>
    </Modal>
  );
}
