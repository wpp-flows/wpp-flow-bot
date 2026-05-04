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
import { queryKeys } from '@/lib/queryClient';
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
      qc.invalidateQueries({ queryKey: queryKeys.menu.categories });
      toast.success('Category added');
      onClose();
    },
  });

  const update = useMutation({
    mutationFn: (v: CategoryFormValues) =>
      menuService.updateCategory({ id: category!.id, ...v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.menu.categories });
      toast.success('Category updated');
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
      title={editing ? 'Edit category' : 'New category'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="category-form"
            loading={isSubmitting || create.isPending || update.isPending}
          >
            {editing ? 'Save changes' : 'Create category'}
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
        <FormField label="Name" htmlFor="cat-name" error={errors.name?.message} required>
          <Input
            id="cat-name"
            placeholder="e.g. Pizzas"
            invalid={!!errors.name}
            {...register('name')}
          />
        </FormField>
        <FormField
          label="Description"
          htmlFor="cat-desc"
          error={errors.description?.message}
        >
          <Textarea
            id="cat-desc"
            placeholder="Wood-fired classics — short subtitle shown to customers."
            invalid={!!errors.description}
            {...register('description')}
          />
        </FormField>
      </form>
    </Modal>
  );
}
