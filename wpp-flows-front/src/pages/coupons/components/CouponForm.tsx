import { type Dispatch, type SetStateAction } from 'react';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { Textarea } from '@/components/ui/Textarea';
import type { CouponFormState } from '../helpers/coupons-helpers';

interface Props {
  form: CouponFormState;
  setForm: Dispatch<SetStateAction<CouponFormState>>;
}

export function CouponForm({ form, setForm }: Readonly<Props>) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="coupon-code">Código</Label>
        <Input
          id="coupon-code"
          value={form.code}
          onChange={(e) =>
            setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))
          }
          placeholder="BEMVINDO10"
          className="font-mono"
        />
        <p className="mt-1 text-2xs text-muted-foreground">
          O cliente digita esse código no checkout. Não diferencia maiúsculas
          de minúsculas.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="coupon-type">Tipo</Label>
          <Select
            id="coupon-type"
            value={form.discountType}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                discountType: e.target.value as CouponFormState['discountType'],
              }))
            }
          >
            <option value="PERCENT">Percentual (%)</option>
            <option value="FIXED">Valor fixo (R$)</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="coupon-value">
            {form.discountType === 'PERCENT' ? 'Desconto (%)' : 'Desconto (R$)'}
          </Label>
          <Input
            id="coupon-value"
            type="text"
            inputMode="decimal"
            value={form.discountValue}
            onChange={(e) => setForm((f) => ({ ...f, discountValue: e.target.value }))}
            placeholder={form.discountType === 'PERCENT' ? '10' : '15,00'}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="coupon-from">Válido de</Label>
          <Input
            id="coupon-from"
            type="date"
            value={form.validFrom}
            onChange={(e) => setForm((f) => ({ ...f, validFrom: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="coupon-until">Válido até</Label>
          <Input
            id="coupon-until"
            type="date"
            value={form.validUntil}
            onChange={(e) => setForm((f) => ({ ...f, validUntil: e.target.value }))}
          />
        </div>
      </div>
      <p className="-mt-2 text-2xs text-muted-foreground">
        Deixe em branco para um cupom sem janela de validade.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="coupon-max-uses">Limite total de usos</Label>
          <Input
            id="coupon-max-uses"
            type="number"
            inputMode="numeric"
            min="1"
            step="1"
            value={form.maxUses}
            onChange={(e) => setForm((f) => ({ ...f, maxUses: e.target.value }))}
            placeholder="—"
          />
        </div>
        <div>
          <Label htmlFor="coupon-max-per-customer">Limite por cliente</Label>
          <Input
            id="coupon-max-per-customer"
            type="number"
            inputMode="numeric"
            min="1"
            step="1"
            value={form.maxUsesPerCustomer}
            onChange={(e) =>
              setForm((f) => ({ ...f, maxUsesPerCustomer: e.target.value }))
            }
            placeholder="—"
          />
        </div>
      </div>
      <p className="-mt-2 text-2xs text-muted-foreground">
        Em branco = sem limite. Para "uma vez por cliente", coloque <b>1</b> no
        limite por cliente.
      </p>

      <div>
        <Label htmlFor="coupon-description">Descrição (opcional)</Label>
        <Textarea
          id="coupon-description"
          rows={2}
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          placeholder='Ex.: "Desconto de boas-vindas"'
        />
      </div>

      <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 p-3">
        <div>
          <p className="text-sm font-medium">Cupom ativo</p>
          <p className="text-2xs text-muted-foreground">
            Quando inativo, não pode ser aplicado no checkout.
          </p>
        </div>
        <Switch
          checked={form.isActive}
          onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
        />
      </div>
    </div>
  );
}
