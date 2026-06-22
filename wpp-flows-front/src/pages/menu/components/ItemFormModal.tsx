import { useEffect, useMemo, useRef, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DollarSign, Eye, ImageOff, ImagePlus, Plus } from 'lucide-react';
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
import type { PublicMenuItem } from '@/types/publicMenu';
import { ProductDetailSheet } from '@/pages/public-menu/components/ProductDetailSheet';
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
  const [previewOpen, setPreviewOpen] = useState(false);

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

  const values = watch();
  const available = values.available;
  const availableDaysOfWeek = values.availableDaysOfWeek ?? [];
  const imageUrl = values.imageUrl;

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

  const onSubmit = (v: MenuItemFormValues) => {
    if (editing) update.mutate(v);
    else create.mutate(v);
  };

  const draftItem = useMemo<PublicMenuItem>(
    () => buildPublicMenuItemDraft(values, item?.id),
    [values, item?.id],
  );

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={editing ? 'Editar item' : 'Novo item'}
        size="2xl"
        footer={
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              leftIcon={<Eye />}
              onClick={() => setPreviewOpen(true)}
              className="w-full sm:w-auto"
            >
              <span className="sm:hidden">Visualizar</span>
              <span className="hidden sm:inline">Visualizar como o cliente vê</span>
            </Button>
            <div className="flex items-center gap-2 sm:flex-none">
              <Button
                variant="ghost"
                onClick={onClose}
                className="flex-1 sm:flex-none"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                form="item-form"
                loading={isSubmitting || create.isPending || update.isPending}
                className="flex-1 sm:flex-none"
              >
                {editing ? 'Salvar alterações' : 'Adicionar item'}
              </Button>
            </div>
          </div>
        }
      >
        <form
          id="item-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4 py-1 sm:gap-5"
          noValidate
        >
          <FormSection
            title="Foto e identidade"
            description="A foto é o primeiro contato do cliente — use uma imagem nítida, bem enquadrada e sem texto."
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[180px_minmax(0,1fr)]">
              <div className="mx-auto w-full max-w-[160px] sm:mx-0 sm:max-w-none">
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
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="group relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-muted/30 transition hover:border-primary hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {imageUrl ? (
                    <>
                      <img
                        src={imageUrl}
                        alt="Pré-visualização"
                        className="h-full w-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                      <span className="absolute inset-0 flex items-center justify-center bg-foreground/40 text-xs font-medium text-white opacity-0 transition group-hover:opacity-100">
                        Trocar imagem
                      </span>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-muted-foreground">
                      <ImagePlus className="h-6 w-6" />
                      <span className="text-2xs font-medium">Enviar foto</span>
                      <span className="text-[10px]">PNG, JPG, WEBP, GIF</span>
                    </div>
                  )}
                </button>
                {imageUrl ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-2 w-full"
                    onClick={() => setValue('imageUrl', '', { shouldDirty: true })}
                  >
                    Remover imagem
                  </Button>
                ) : null}
                {uploadImage.isPending ? (
                  <p className="mt-2 text-center text-2xs text-muted-foreground">
                    Enviando…
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col gap-3">
                <FormField
                  label="Nome do item"
                  htmlFor="itm-name"
                  error={errors.name?.message}
                  required
                >
                  <Input
                    id="itm-name"
                    placeholder="Ex.: Pizza Margherita"
                    invalid={!!errors.name}
                    {...register('name')}
                  />
                </FormField>
                <FormField
                  label="Categoria"
                  htmlFor="itm-cat"
                  error={errors.categoryId?.message}
                  required
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
                  label="Descrição"
                  htmlFor="itm-desc"
                  error={errors.description?.message}
                  hint="Conte sobre os ingredientes, o ponto da massa, harmonizações…"
                >
                  <Textarea
                    id="itm-desc"
                    rows={3}
                    placeholder="Tomate San Marzano, fior di latte, manjericão fresco."
                    invalid={!!errors.description}
                    {...register('description')}
                  />
                </FormField>
              </div>
            </div>
          </FormSection>

          <FormSection
            title="Preços"
            description="Coloque o preço normal e, opcionalmente, um preço promocional. O preço promocional aparece em destaque e o normal vem riscado ao lado."
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField
                label="Preço"
                htmlFor="itm-price"
                error={errors.price?.message}
                required
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
                hint="Opcional. Quando preenchido, é o que o cliente paga; o preço normal aparece riscado."
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
            </div>
          </FormSection>

          <FormSection
            title="Disponibilidade"
            description="Controle quando o item aparece no cardápio público."
          >
            <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/30 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Disponível agora</p>
                <p className="text-2xs text-muted-foreground">
                  Quando desligado, o item fica oculto para os clientes mas
                  permanece no cardápio para você.
                </p>
              </div>
              <Switch
                checked={!!available}
                onChange={(e) =>
                  setValue('available', e.target.checked, { shouldDirty: true })
                }
              />
            </div>

            <div className="rounded-md border border-border bg-muted/30 px-3 py-2.5">
              <p className="text-sm font-medium">Dias da semana</p>
              <p className="text-2xs text-muted-foreground">
                Selecione os dias em que este item aparece. Vazio = todos os dias.
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
          </FormSection>

          <FormSection
            title="Grupos de opções"
            description='Personalizações: combos, perguntas obrigatórias ("Escolha 1 opção"), adicionais opcionais com preço extra. Cada grupo tem mínimo e máximo de seleções.'
            actions={
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
            }
          >
            {optionGroups.fields.length === 0 ? (
              <div className="flex flex-col items-center gap-1 rounded-md border border-dashed border-border bg-muted/20 px-3 py-6 text-center">
                <ImageOff className="h-5 w-5 text-muted-foreground" />
                <p className="text-2xs italic text-muted-foreground">
                  Sem grupos. Itens sem grupos vão direto ao carrinho pelo preço base.
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
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
          </FormSection>
        </form>
      </Modal>

      <ProductDetailSheet
        item={previewOpen ? draftItem : null}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        onConfirm={() => setPreviewOpen(false)}
        disabled
      />
    </>
  );
}

interface FormSectionProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

function FormSection({
  title,
  description,
  actions,
  children,
}: Readonly<FormSectionProps>) {
  return (
    <section className="rounded-lg border border-border bg-card/40 p-3 sm:p-4">
      <header className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
          {description ? (
            <p className="mt-0.5 text-2xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions}
      </header>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}

// Form inputs registered via react-hook-form arrive as strings ("29.99") and
// Zod only coerces on submit, so Number.isFinite(stringValue) is false. Coerce
// explicitly here or the preview silently zeroes every price.
function toNumber(v: unknown): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function moneyToString(v: unknown): string | null {
  if (v == null || v === '') return null;
  const n = toNumber(v);
  return n > 0 ? n.toFixed(2) : null;
}

function buildPublicMenuItemDraft(
  v: MenuItemFormValues,
  existingId?: string,
): PublicMenuItem {
  return {
    id: existingId ?? 'draft',
    categoryId: v.categoryId,
    name: v.name?.trim() || 'Sem nome ainda',
    description: v.description?.trim() ?? '',
    price: toNumber(v.price).toFixed(2),
    promotionalPrice: moneyToString(v.promotionalPrice),
    imageUrl: v.imageUrl?.trim() ? v.imageUrl.trim() : null,
    position: 0,
    optionGroups: (v.optionGroups ?? []).map((g, gIdx) => ({
      id: g.id,
      title: g.title?.trim() || `Grupo ${gIdx + 1}`,
      subtitle: g.subtitle?.trim() || null,
      minSelections: Math.max(0, Math.floor(toNumber(g.minSelections))),
      maxSelections: Math.max(1, Math.floor(toNumber(g.maxSelections))),
      position: gIdx,
      options: g.options.map((o, oIdx) => ({
        id: o.id,
        name: o.name?.trim() || `Opção ${oIdx + 1}`,
        additionalPrice: toNumber(o.additionalPrice).toFixed(2),
        imageUrl: o.imageUrl?.trim() || null,
        position: oIdx,
      })),
    })),
  };
}
