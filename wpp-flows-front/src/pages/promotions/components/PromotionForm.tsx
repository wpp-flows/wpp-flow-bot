import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { Textarea } from '@/components/ui/Textarea';
import { cn } from '@/lib/utils';
import type {
  MenuItem,
  PromotionDiscountType,
  PromotionKind,
} from '@/types';
import {
  DAY_LABELS,
  type PromotionFormState,
} from '../promotions-constants';

interface Props {
  form: PromotionFormState;
  setForm: React.Dispatch<React.SetStateAction<PromotionFormState>>;
  menuItems: MenuItem[];
}

export function PromotionForm({ form, setForm, menuItems }: Readonly<Props>) {
  const featuredItem = menuItems.find((it) => it.id === form.featuredItemId);
  const regularPrice = featuredItem ? Number.parseFloat(featuredItem.price) : null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <FormField label="Tipo" htmlFor="promo-kind" required>
        <Select
          id="promo-kind"
          value={form.kind}
          onChange={(e) => setForm({ ...form, kind: e.target.value as PromotionKind })}
        >
          <option value="NTH_ORDER_DISCOUNT">Desconto no Nº pedido</option>
          <option value="DAILY_MESSAGE">Mensagem do dia</option>
        </Select>
      </FormField>
      <FormField label="Nome" htmlFor="promo-name" required>
        <Input
          id="promo-name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Ex: 2 pizzas + refri grátis"
        />
      </FormField>

      {form.kind === 'NTH_ORDER_DISCOUNT' ? (
        <NthOrderFields form={form} setForm={setForm} />
      ) : null}
      {form.kind === 'DAILY_MESSAGE' ? (
        <DailyMessageFields
          form={form}
          setForm={setForm}
          menuItems={menuItems}
          regularPrice={regularPrice}
        />
      ) : null}

      <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2.5 sm:col-span-2">
        <div>
          <p className="text-sm font-medium">Ativa</p>
          <p className="text-2xs text-muted-foreground">
            Promoções inativas não são aplicadas no bot.
          </p>
        </div>
        <Switch
          checked={form.isActive}
          onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
        />
      </div>
    </div>
  );
}

function NthOrderFields({
  form,
  setForm,
}: Readonly<Pick<Props, 'form' | 'setForm'>>) {
  return (
    <>
      <FormField label="Aplica no Nº" htmlFor="promo-n">
        <Input
          id="promo-n"
          type="number"
          min="1"
          value={form.nthOrder}
          onChange={(e) => setForm({ ...form, nthOrder: e.target.value })}
        />
      </FormField>
      <FormField label="Tipo de desconto" htmlFor="promo-disc-type">
        <Select
          id="promo-disc-type"
          value={form.discountType}
          onChange={(e) =>
            setForm({ ...form, discountType: e.target.value as PromotionDiscountType })
          }
        >
          <option value="PERCENT">% sobre o subtotal</option>
          <option value="FIXED">Valor fixo (R$)</option>
        </Select>
      </FormField>
      <FormField label="Valor" htmlFor="promo-disc-val">
        <Input
          id="promo-disc-val"
          value={form.discountValue}
          onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
          placeholder={form.discountType === 'PERCENT' ? '10' : '5,00'}
        />
      </FormField>
      <FormField
        label="Teaser: aviso N pedidos antes"
        htmlFor="promo-teaser-offset"
        hint="Vazio para não enviar teaser."
      >
        <Input
          id="promo-teaser-offset"
          type="number"
          min="1"
          value={form.teaserOrderOffset}
          onChange={(e) => setForm({ ...form, teaserOrderOffset: e.target.value })}
          placeholder="2"
        />
      </FormField>
      <FormField
        label="Mensagem do teaser"
        htmlFor="promo-teaser-msg"
        className="sm:col-span-2"
        hint="Aparece no checkout para o cliente que está perto do pedido qualificante."
      >
        <Textarea
          id="promo-teaser-msg"
          rows={2}
          value={form.teaserMessage}
          onChange={(e) => setForm({ ...form, teaserMessage: e.target.value })}
          placeholder="Ex: Este é seu 3º pedido — no 5º você ganha 10% off!"
        />
      </FormField>
      <FormField
        label="Mensagem ao ganhar o desconto"
        htmlFor="promo-qualifying-msg"
        className="sm:col-span-2"
        hint="Aparece no checkout quando o cliente está exatamente no pedido qualificante. Em branco usa um texto padrão."
      >
        <Textarea
          id="promo-qualifying-msg"
          rows={2}
          value={form.qualifyingMessage}
          onChange={(e) => setForm({ ...form, qualifyingMessage: e.target.value })}
          placeholder="Ex: 🎉 5º pedido — você ganhou 10% off, está aplicado já!"
        />
      </FormField>
    </>
  );
}

function DailyMessageFields({
  form,
  setForm,
  menuItems,
  regularPrice,
}: Readonly<Props & { regularPrice: number | null }>) {
  return (
    <>
      <FormField label="Mensagem" htmlFor="promo-msg" required className="sm:col-span-2">
        <Textarea
          id="promo-msg"
          rows={3}
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          placeholder="Ex: Promoção do dia: pizza grande + refri por R$ 49,90"
        />
      </FormField>
      <FormField label="Dias da semana" htmlFor="" className="sm:col-span-2">
        <div className="flex flex-wrap gap-2">
          {DAY_LABELS.map((label, idx) => {
            const active = form.daysOfWeek.includes(idx);
            return (
              <button
                key={label}
                type="button"
                onClick={() =>
                  setForm({
                    ...form,
                    daysOfWeek: active
                      ? form.daysOfWeek.filter((d) => d !== idx)
                      : [...form.daysOfWeek, idx].sort((a, b) => a - b),
                  })
                }
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-medium transition',
                  active
                    ? 'border-primary bg-primary-soft text-primary'
                    : 'border-border bg-card text-muted-foreground hover:text-foreground',
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
        <p className="mt-1 text-2xs text-muted-foreground">
          Vazio = todos os dias.
        </p>
      </FormField>

      <FormField
        label="Item do dia (opcional)"
        htmlFor="promo-featured-item"
        hint="O bot envia este item destacado junto da mensagem da promoção."
        className="sm:col-span-2"
      >
        <Select
          id="promo-featured-item"
          value={form.featuredItemId}
          onChange={(e) => setForm({ ...form, featuredItemId: e.target.value })}
        >
          <option value="">Sem item destacado</option>
          {menuItems.map((it) => (
            <option key={it.id} value={it.id}>
              {it.name} · R$ {it.price}
            </option>
          ))}
        </Select>
      </FormField>

      {form.featuredItemId ? (
        <FormField
          label="Preço promocional (R$)"
          htmlFor="promo-price"
          hint={
            regularPrice
              ? `Preço normal: R$ ${regularPrice.toFixed(2).replace('.', ',')}. Deixe vazio para apenas destacar o item.`
              : 'Deixe vazio para apenas destacar o item.'
          }
          className="sm:col-span-2"
        >
          <Input
            id="promo-price"
            inputMode="decimal"
            value={form.promotionalPrice}
            onChange={(e) => setForm({ ...form, promotionalPrice: e.target.value })}
            placeholder={regularPrice ? regularPrice.toFixed(2) : '0,00'}
          />
          {regularPrice &&
            form.promotionalPrice &&
            Number.parseFloat(form.promotionalPrice.replace(',', '.')) >= regularPrice ? (
            <p className="mt-1 text-2xs text-warning">
              Preço promocional não é menor que o normal — nenhum desconto será aplicado.
            </p>
          ) : null}
        </FormField>
      ) : null}
    </>
  );
}

