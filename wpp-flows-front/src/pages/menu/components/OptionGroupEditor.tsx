import {
  useFieldArray,
  type Control,
  type FieldErrors,
  type UseFormRegister,
  type UseFormWatch,
} from 'react-hook-form';
import { ChevronDown, ChevronUp, DollarSign, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  deriveOptionGroupHelperText,
  type MenuItemFormValues,
} from '@/lib/schemas';

interface Props {
  groupIndex: number;
  control: Control<MenuItemFormValues>;
  register: UseFormRegister<MenuItemFormValues>;
  watch: UseFormWatch<MenuItemFormValues>;
  errors: FieldErrors<MenuItemFormValues>;
  onRemoveGroup: () => void;
  onMoveUp: (() => void) | null;
  onMoveDown: (() => void) | null;
}

export function OptionGroupEditor({
  groupIndex,
  control,
  register,
  watch,
  errors,
  onRemoveGroup,
  onMoveUp,
  onMoveDown,
}: Readonly<Props>) {
  const options = useFieldArray({
    control,
    name: `optionGroups.${groupIndex}.options`,
  });

  const minRaw = watch(`optionGroups.${groupIndex}.minSelections`);
  const maxRaw = watch(`optionGroups.${groupIndex}.maxSelections`);
  const minNum = Math.max(0, Math.floor(Number(minRaw ?? 0) || 0));
  const maxNum = Math.max(1, Math.floor(Number(maxRaw ?? 1) || 1));
  const helperPreview = deriveOptionGroupHelperText(minNum, maxNum);

  const groupErrors = errors.optionGroups?.[groupIndex];

  return (
    <div className="rounded-md border border-border bg-card p-3 space-y-3">
      <div className="flex items-start gap-2">
        <div className="flex flex-col gap-0.5">
          <button
            type="button"
            onClick={onMoveUp ?? undefined}
            disabled={!onMoveUp}
            aria-label="Mover grupo para cima"
            className="rounded p-0.5 text-muted-foreground transition hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onMoveDown ?? undefined}
            disabled={!onMoveDown}
            aria-label="Mover grupo para baixo"
            className="rounded p-0.5 text-muted-foreground transition hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <Input
            placeholder="Título do grupo (ex: Escolha o sanduíche)"
            invalid={!!groupErrors?.title}
            {...register(`optionGroups.${groupIndex}.title`)}
          />
          {groupErrors?.title?.message ? (
            <p className="text-2xs text-destructive">{groupErrors.title.message}</p>
          ) : null}
          <Input
            placeholder="Subtítulo (opcional) — substitui o texto automático abaixo"
            {...register(`optionGroups.${groupIndex}.subtitle`)}
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onRemoveGroup}
          aria-label="Remover grupo"
          className="text-destructive"
        >
          <Trash2 />
        </Button>
      </div>

      <div className="grid grid-cols-[1fr_1fr] gap-2">
        <label className="space-y-1">
          <span className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
            Mínimo
          </span>
          <Input
            type="number"
            min={0}
            max={50}
            invalid={!!groupErrors?.minSelections}
            {...register(`optionGroups.${groupIndex}.minSelections`)}
          />
          {groupErrors?.minSelections?.message ? (
            <p className="text-2xs text-destructive">
              {groupErrors.minSelections.message}
            </p>
          ) : null}
        </label>
        <label className="space-y-1">
          <span className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
            Máximo
          </span>
          <Input
            type="number"
            min={1}
            max={50}
            invalid={!!groupErrors?.maxSelections}
            {...register(`optionGroups.${groupIndex}.maxSelections`)}
          />
          {groupErrors?.maxSelections?.message ? (
            <p className="text-2xs text-destructive">
              {groupErrors.maxSelections.message}
            </p>
          ) : null}
        </label>
      </div>

      <p className="rounded bg-muted/40 px-2 py-1 text-2xs italic text-muted-foreground">
        Texto exibido ao cliente: <span className="not-italic font-medium text-foreground">{helperPreview}</span>
      </p>

      <div className="rounded-md border border-dashed border-border bg-background/60 p-2 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
            Opções
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            leftIcon={<Plus />}
            onClick={() =>
              options.append({
                id: crypto.randomUUID(),
                name: '',
                additionalPrice: 0,
              })
            }
          >
            Adicionar opção
          </Button>
        </div>

        {options.fields.length === 0 ? (
          <p className="text-2xs italic text-muted-foreground">
            Nenhuma opção. Adicione ao menos uma.
          </p>
        ) : (
          <ul className="space-y-2">
            {options.fields.map((field, optIdx) => {
              const optErrors = groupErrors?.options?.[optIdx];
              return (
                <li
                  key={field.id}
                  className="grid grid-cols-[1fr_auto] gap-2 sm:grid-cols-[1fr_150px_auto]"
                >
                  <Input
                    placeholder="Nome (ex: Frango, Carne, Veggie)"
                    invalid={!!optErrors?.name}
                    className="col-span-2 sm:col-span-1"
                    {...register(
                      `optionGroups.${groupIndex}.options.${optIdx}.name`,
                    )}
                  />
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    leftIcon={<DollarSign />}
                    invalid={!!optErrors?.additionalPrice}
                    {...register(
                      `optionGroups.${groupIndex}.options.${optIdx}.additionalPrice`,
                    )}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => options.remove(optIdx)}
                    aria-label="Remover opção"
                    className="self-center text-destructive"
                  >
                    <Trash2 />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
        {groupErrors?.options?.message ? (
          <p className="text-2xs text-destructive">{groupErrors.options.message}</p>
        ) : null}
      </div>
    </div>
  );
}
