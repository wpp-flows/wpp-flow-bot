import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DollarSign } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { FormField } from '@/components/ui/FormField';
import { Switch } from '@/components/ui/Switch';
import { menuItemSchema, type MenuItemFormValues } from '@/lib/schemas';
import { menuService } from '@/services/menuService';
import { invalidateQueriesByFilters, queryKeys } from '@/lib/queryClient';
import { toast } from '@/stores/uiStore';
import type { MenuCategory, MenuItem } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
  categories: MenuCategory[];
  defaultCategoryId?: string;
  item?: MenuItem | null;
}

export function ItemFormModal({ open, onClose, categories, defaultCategoryId, item }: Props) {
  const qc = useQueryClient();
  const editing = Boolean(item);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<MenuItemFormValues>({
    resolver: zodResolver(menuItemSchema),
    defaultValues: {
      categoryId: defaultCategoryId ?? categories[0]?.id ?? '',
      name: '',
      description: '',
      price: 0,
      imageUrl: '',
      available: true,
    },
  });

  const available = watch('available');

  useEffect(() => {
    if (open) {
      reset({
        categoryId: item?.categoryId ?? defaultCategoryId ?? categories[0]?.id ?? '',
        name: item?.name ?? '',
        description: item?.description ?? '',
        price: item?.price === undefined ? 0 : Number(item.price),
        imageUrl: item?.imageUrl ?? '',
        available: item?.available ?? true,
      });
    }
  }, [open, item, defaultCategoryId, categories, reset]);

  const create = useMutation({
    mutationFn: (v: MenuItemFormValues) =>
      menuService.createItem({
        categoryId: v.categoryId,
        name: v.name,
        description: v.description ?? '',
        price: v.price,
        imageUrl: v.imageUrl,
        available: v.available,
      }),
    onSuccess: () => {
      void invalidateQueriesByFilters(qc, [{ queryKey: queryKeys.menu.items }]);
      toast.success('Item adicionado');
      onClose();
    },
  });

  const update = useMutation({
    mutationFn: (v: MenuItemFormValues) =>
      menuService.updateItem({ id: item!.id, ...v, description: v.description ?? '' }),
    onSuccess: () => {
      void invalidateQueriesByFilters(qc, [{ queryKey: queryKeys.menu.items }]);
      toast.success('Item atualizado');
      onClose();
    },
  });

  const onSubmit = (values: MenuItemFormValues) => {
    if (editing) update.mutate(values);
    else create.mutate(values);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Editar item' : 'Novo item'}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="item-form"
            loading={isSubmitting || create.isPending || update.isPending}
          >
            {editing ? 'Salvar alteracoes' : 'Adicionar item'}
          </Button>
        </>
      }
    >
      <form
        id="item-form"
        onSubmit={handleSubmit(onSubmit)}
        className="grid grid-cols-1 gap-4 py-1 sm:grid-cols-2"
        noValidate
      >
        <FormField
          label="Categoria"
          htmlFor="itm-cat"
          error={errors.categoryId?.message}
          required
          className="sm:col-span-1"
        >
          <Select id="itm-cat" invalid={!!errors.categoryId} {...register('categoryId')}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField
          label="Nome"
          htmlFor="itm-name"
          error={errors.name?.message}
          required
          className="sm:col-span-1"
        >
          <Input
            id="itm-name"
            placeholder="Margherita"
            invalid={!!errors.name}
            {...register('name')}
          />
        </FormField>
        <FormField
          label="Descricao"
          htmlFor="itm-desc"
          error={errors.description?.message}
          className="sm:col-span-2"
        >
          <Textarea
            id="itm-desc"
            rows={3}
            placeholder="Tomate San Marzano, fior di latte, manjericao..."
            invalid={!!errors.description}
            {...register('description')}
          />
        </FormField>
        <FormField
          label="Preco"
          htmlFor="itm-price"
          error={errors.price?.message}
          required
          className="sm:col-span-1"
        >
          <Input
            id="itm-price"
            type="number"
            step="0.01"
            min="0"
            leftIcon={<DollarSign />}
            invalid={!!errors.price}
            {...register('price')}
          />
        </FormField>
        <FormField
          label="URL da imagem"
          htmlFor="itm-img"
          error={errors.imageUrl?.message}
          hint="Opcional. Use uma imagem 1:1 quando possivel."
          className="sm:col-span-1"
        >
          <Input
            id="itm-img"
            placeholder="https://..."
            invalid={!!errors.imageUrl}
            {...register('imageUrl')}
          />
        </FormField>
        <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2.5 sm:col-span-2">
          <div>
            <p className="text-sm font-medium">Disponivel</p>
            <p className="text-2xs text-muted-foreground">
              Itens ocultos permanecem no menu, mas nao sao oferecidos aos clientes.
            </p>
          </div>
          <Switch
            checked={!!available}
            onChange={(e) => setValue('available', e.target.checked, { shouldDirty: true })}
          />
        </div>
      </form>
    </Modal>
  );
}
