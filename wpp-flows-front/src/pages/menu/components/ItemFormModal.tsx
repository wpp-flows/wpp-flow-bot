import { useEffect, useRef } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DollarSign, ImageOff, ImagePlus, Plus } from 'lucide-react';
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
import type { MenuCategory, MenuItem, ServiceType } from '@/types';
import { OptionGroupEditor } from './OptionGroupEditor';

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const;

interface Props {
  open: boolean;
  onClose: () => void;
  categories: MenuCategory[];
  defaultCategoryId?: string;
  item?: MenuItem | null;
  serviceType: ServiceType;
}

export function ItemFormModal({
  open,
  onClose,
  categories,
  defaultCategoryId,
  item,
  serviceType,
}: Readonly<Props>) {
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
      optionGroups: [],
    },
  });

  const available = watch('available');
  const availableDaysOfWeek = watch('availableDaysOfWeek') ?? [];
  const imageUrl = watch('imageUrl');

  const optionGroups = useFieldArray({ control, name: 'optionGroups' });

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
        originalPrice: item?.originalPrice ? Number(item.originalPrice) : null,
        promotionalPrice: item?.promotionalPrice ? Number(item.promotionalPrice) : null,
        imageUrl: item?.imageUrl ?? '',
        available: item?.available ?? true,
        availableDaysOfWeek: item?.availableDaysOfWeek ?? [],
        optionGroups:
          item?.optionGroups.map((g) => ({
            id: g.id,
            title: g.title,
            subtitle: g.subtitle ?? '',
            minSelections: g.minSelections,
            maxSelections: g.maxSelections,
            options: g.options.map((o) => ({
              id: o.id,
              name: o.name,
              additionalPrice: Number(o.additionalPrice),
              imageUrl: o.imageUrl ?? undefined,
            })),
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
        originalPrice: v.originalPrice,
        promotionalPrice: v.promotionalPrice,
        imageUrl: v.imageUrl?.trim() ? v.imageUrl.trim() : undefined,
        available: v.available,
        availableDaysOfWeek: v.availableDaysOfWeek ?? [],
        optionGroups: (v.optionGroups ?? []).map((g) => ({
          id: g.id,
          title: g.title,
          subtitle: g.subtitle?.trim() || null,
          minSelections: g.minSelections,
          maxSelections: g.maxSelections,
          options: g.options.map((o) => ({
            id: o.id,
            name: o.name,
            additionalPrice: o.additionalPrice,
            imageUrl: o.imageUrl?.trim() || undefined,
          })),
        })),
      }),
    onSuccess: () => {
      void invalidateQueriesByFilters(qc, [
        { queryKey: queryKeys.menu.items(serviceType) },
      ]);
      toast.success('Item adicionado');
      onClose();
    },
  });

  const update = useMutation({
    mutationFn: (v: MenuItemFormValues) =>
      menuService.updateItem({
        id: item!.id,
        categoryId: v.categoryId,
        name: v.name,
        description: v.description ?? '',
        price: v.price,
        originalPrice: v.originalPrice,
        promotionalPrice: v.promotionalPrice,
        imageUrl: v.imageUrl?.trim() ? v.imageUrl.trim() : null,
        available: v.available,
        availableDaysOfWeek: v.availableDaysOfWeek ?? [],
        optionGroups: (v.optionGroups ?? []).map((g) => ({
          id: g.id,
          title: g.title,
          subtitle: g.subtitle?.trim() || null,
          minSelections: g.minSelections,
          maxSelections: g.maxSelections,
          options: g.options.map((o) => ({
            id: o.id,
            name: o.name,
            additionalPrice: o.additionalPrice,
            imageUrl: o.imageUrl?.trim() || undefined,
          })),
        })),
      }),
    onSuccess: () => {
      void invalidateQueriesByFilters(qc, [
        { queryKey: queryKeys.menu.items(serviceType) },
      ]);
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
          label="Preço"
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
          label="Preço promocional"
          htmlFor="itm-promo-price"
          error={errors.promotionalPrice?.message}
          hint="Opcional. Quando preenchido, é o que o cliente paga; o preço normal aparece riscado no cardápio."
          className="sm:col-span-1"
        >
          <Input
            id="itm-promo-price"
            type="number"
            step="0.01"
            min="0"
            placeholder="—"
            leftIcon={<DollarSign />}
            invalid={!!errors.promotionalPrice}
            {...register('promotionalPrice')}
          />
        </FormField>
        <FormField
          label="Preço antes (de)"
          htmlFor="itm-original-price"
          error={errors.originalPrice?.message}
          hint="Opcional. Mostra um valor riscado acima do preço atual — útil para campanhas com 'de R$X por R$Y'."
          className="sm:col-span-1"
        >
          <Input
            id="itm-original-price"
            type="number"
            step="0.01"
            min="0"
            placeholder="—"
            leftIcon={<DollarSign />}
            invalid={!!errors.originalPrice}
            {...register('originalPrice')}
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
              <p className="text-sm font-medium">Grupos de opções</p>
              <p className="text-2xs text-muted-foreground">
                Personalizações estilo iFood: combos, perguntas com "Escolha 1
                opção" / "Escolha até N", adicionais com preço extra. Cada
                grupo tem mín./máx. de seleções; obrigatório quando mín. ≥ 1.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              leftIcon={<Plus />}
              onClick={() =>
                optionGroups.append({
                  id: crypto.randomUUID(),
                  title: '',
                  subtitle: '',
                  minSelections: 0,
                  maxSelections: 1,
                  options: [
                    {
                      id: crypto.randomUUID(),
                      name: '',
                      additionalPrice: 0,
                    },
                  ],
                })
              }
            >
              Adicionar grupo
            </Button>
          </div>

          {optionGroups.fields.length === 0 ? (
            <p className="mt-3 text-2xs italic text-muted-foreground">
              Nenhum grupo configurado. Itens sem grupos vão direto ao
              carrinho pelo preço base.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {optionGroups.fields.map((field, idx) => (
                <li key={field.id}>
                  <OptionGroupEditor
                    groupIndex={idx}
                    control={control}
                    register={register}
                    watch={watch}
                    errors={errors}
                    onRemoveGroup={() => optionGroups.remove(idx)}
                    onMoveUp={idx > 0 ? () => optionGroups.move(idx, idx - 1) : null}
                    onMoveDown={
                      idx < optionGroups.fields.length - 1
                        ? () => optionGroups.move(idx, idx + 1)
                        : null
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </form>
    </Modal>
  );
}
