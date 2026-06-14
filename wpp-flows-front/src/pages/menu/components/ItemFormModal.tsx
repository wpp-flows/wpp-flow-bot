import { useEffect, useRef } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DollarSign, ImageOff, ImagePlus, Plus, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { FormField } from '@/components/ui/FormField';
import { Switch } from '@/components/ui/Switch';
import { menuItemSchema, type MenuItemFormValues } from '@/lib/schemas';
import { menuService } from '@/services/menuService';
import { uploadService } from '@/services/uploadService';
import { invalidateQueriesByFilters, queryKeys } from '@/lib/queryClient';
import { toast } from '@/stores/uiStore';
import { downscaleImage } from '@/helpers/image-helpers';
import type { MenuCategory, MenuItem } from '@/types';

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const;

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
    control,
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
      availableDaysOfWeek: [],
      availableForDelivery: true,
      availableForLocal: true,
      additionals: [],
    },
  });

  const available = watch('available');
  const availableDaysOfWeek = watch('availableDaysOfWeek') ?? [];
  const availableForDelivery = watch('availableForDelivery') ?? true;
  const availableForLocal = watch('availableForLocal') ?? true;
  const imageUrl = watch('imageUrl');

  const additionals = useFieldArray({ control, name: 'additionals' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadImage = useMutation({
    mutationFn: async (file: File) => {
      const prepared = await downscaleImage(file);
      return uploadService.menuItemImage(prepared);
    },
    onSuccess: (res) => {
      setValue('imageUrl', res.url, { shouldDirty: true });
      toast.success('Imagem enviada');
    },
    onError: (err) =>
      toast.error('Falha no upload', err instanceof Error ? err.message : undefined),
  });

  const handleFilePicked = (file: File) => {
    if (file.size > MAX_UPLOAD_BYTES * 4) {
      toast.error(
        'Imagem muito grande',
        'Envie uma foto de até ~20 MB. Tente reduzir antes.',
      );
      return;
    }
    try {
      uploadImage.mutate(file);
    } catch (err) {
      console.error('Upload mutate threw synchronously:', err);
      toast.error(
        'Falha no upload',
        err instanceof Error ? err.message : undefined,
      );
    }
  };

  useEffect(() => {
    if (open) {
      reset({
        categoryId: item?.categoryId ?? defaultCategoryId ?? categories[0]?.id ?? '',
        name: item?.name ?? '',
        description: item?.description ?? '',
        price: item?.price === undefined ? 0 : Number(item.price),
        imageUrl: item?.imageUrl ?? '',
        available: item?.available ?? true,
        availableDaysOfWeek: item?.availableDaysOfWeek ?? [],
        availableForDelivery: item?.availableForDelivery ?? true,
        availableForLocal: item?.availableForLocal ?? true,
        additionals:
          item?.additionals.map((a) => ({
            id: a.id,
            name: a.name,
            price: Number(a.price),
          })) ?? [],
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
        imageUrl: v.imageUrl?.trim() ? v.imageUrl.trim() : undefined,
        available: v.available,
        availableDaysOfWeek: v.availableDaysOfWeek ?? [],
        availableForDelivery: v.availableForDelivery ?? true,
        availableForLocal: v.availableForLocal ?? true,
        additionals: v.additionals ?? [],
      }),
    onSuccess: () => {
      void invalidateQueriesByFilters(qc, [{ queryKey: queryKeys.menu.items }]);
      toast.success('Item adicionado');
      onClose();
    },
  });

  const update = useMutation({
    mutationFn: (v: MenuItemFormValues) =>
      menuService.updateItem({
        id: item!.id,
        ...v,
        description: v.description ?? '',
        imageUrl: v.imageUrl?.trim() ? v.imageUrl.trim() : null,
        availableDaysOfWeek: v.availableDaysOfWeek ?? [],
        availableForDelivery: v.availableForDelivery ?? true,
        availableForLocal: v.availableForLocal ?? true,
        additionals: v.additionals ?? [],
      }),
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
          label="Imagem"
          htmlFor="itm-img"
          error={errors.imageUrl?.message}
          hint="Opcional. PNG, JPG, WEBP ou GIF — até 5 MB."
          className="sm:col-span-1"
        >
          <input
            ref={fileInputRef}
            id="itm-img"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) handleFilePicked(file);
            }}
          />
          <div className="flex items-center gap-3">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="Pré-visualização"
                width={64}
                height={64}
                loading="lazy"
                decoding="async"
                className="h-16 w-16 shrink-0 rounded-md border border-border object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md border border-dashed border-border bg-muted/30 text-muted-foreground">
                <ImageOff className="h-5 w-5" />
              </div>
            )}
            <div className="flex flex-1 flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                leftIcon={<ImagePlus />}
                loading={uploadImage.isPending}
                onClick={() => fileInputRef.current?.click()}
              >
                {imageUrl ? 'Trocar imagem' : 'Enviar imagem'}
              </Button>
              {imageUrl ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setValue('imageUrl', '', { shouldDirty: true })
                  }
                >
                  Remover
                </Button>
              ) : null}
            </div>
          </div>
        </FormField>
        <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2.5 sm:col-span-2">
          <div>
            <p className="text-sm font-medium">Disponível</p>
            <p className="text-2xs text-muted-foreground">
              Itens ocultos permanecem no menu, mas não são oferecidos aos clientes.
            </p>
          </div>
          <Switch
            checked={!!available}
            onChange={(e) => setValue('available', e.target.checked, { shouldDirty: true })}
          />
        </div>

        <div className="rounded-md border border-border bg-muted/30 px-3 py-2.5 sm:col-span-2">
          <p className="text-sm font-medium">Disponível em</p>
          <p className="text-2xs text-muted-foreground">
            Escolha em quais canais este item aparece. Por padrão, fica
            disponível para os dois.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={availableForDelivery}
                onChange={(e) =>
                  setValue('availableForDelivery', e.target.checked, {
                    shouldDirty: true,
                  })
                }
              />
              Delivery
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={availableForLocal}
                onChange={(e) =>
                  setValue('availableForLocal', e.target.checked, {
                    shouldDirty: true,
                  })
                }
              />
              Salão (mesas)
            </label>
          </div>
        </div>

        <div className="rounded-md border border-border bg-muted/30 px-3 py-2.5 sm:col-span-2">
          <p className="text-sm font-medium">Dias disponíveis</p>
          <p className="text-2xs text-muted-foreground">
            Selecione os dias da semana em que este item aparece. Vazio = todos os dias.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {DAY_LABELS.map((label, idx) => {
              const active = availableDaysOfWeek.includes(idx);
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    const next = active
                      ? availableDaysOfWeek.filter((d) => d !== idx)
                      : [...availableDaysOfWeek, idx].sort((a, b) => a - b);
                    setValue('availableDaysOfWeek', next, { shouldDirty: true });
                  }}
                  className={
                    active
                      ? 'rounded-full border border-primary bg-primary-soft px-3 py-1 text-xs font-medium text-primary transition'
                      : 'rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground transition hover:text-foreground'
                  }
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-md border border-border bg-muted/30 px-3 py-2.5 sm:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Adicionais</p>
              <p className="text-2xs text-muted-foreground">
                Extras que o cliente pode marcar ao pedir este item (ex: borda
                recheada, queijo extra). O preço soma ao total do pedido.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              leftIcon={<Plus />}
              onClick={() =>
                additionals.append({
                  id: crypto.randomUUID(),
                  name: '',
                  price: 0,
                })
              }
            >
              Adicionar
            </Button>
          </div>

          {additionals.fields.length === 0 ? (
            <p className="mt-3 text-2xs italic text-muted-foreground">
              Nenhum adicional configurado.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {additionals.fields.map((field, idx) => (
                <li
                  key={field.id}
                  className="grid grid-cols-[1fr_auto] gap-2 rounded-md border border-border bg-card p-2 sm:grid-cols-[1fr_140px_auto]"
                >
                  <Input
                    placeholder="Nome (ex: Borda recheada)"
                    invalid={!!errors.additionals?.[idx]?.name}
                    className="col-span-2 sm:col-span-1"
                    {...register(`additionals.${idx}.name`)}
                  />
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    leftIcon={<DollarSign />}
                    invalid={!!errors.additionals?.[idx]?.price}
                    {...register(`additionals.${idx}.price`)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => additionals.remove(idx)}
                    aria-label="Remover adicional"
                    className="self-center text-destructive"
                  >
                    <Trash2 />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </form>
    </Modal>
  );
}
