import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { authService } from '@/services/authService';
import { toast } from '@/stores/uiStore';
import type { Organization } from '@/types';

interface Props {
  organization: Organization | null;
  onUpdated: () => Promise<void> | void;
}

export function DeliverySection({ organization: org, onUpdated }: Props) {
  const [value, setValue] = useState<string>(() => normalize(org?.deliveryFee ?? '0'));

  useEffect(() => {
    setValue(normalize(org?.deliveryFee ?? '0'));
  }, [org]);

  const save = useMutation({
    mutationFn: () => {
      const numeric = Number(value.replace(',', '.'));
      return authService.updateOrganization({
        deliveryFee: Number.isFinite(numeric) && numeric >= 0 ? numeric : 0,
      });
    },
    onSuccess: async () => {
      await onUpdated();
      toast.success('Taxa de entrega salva');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Falha ao salvar'),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Entrega</CardTitle>
        <CardDescription>
          Defina a taxa cobrada quando o cliente escolhe "entregar" no checkout.
          Quando o cliente escolhe "retirar no local", nada é cobrado a mais.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="delivery-fee">Taxa de entrega (R$)</Label>
          <Input
            id="delivery-fee"
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="max-w-[200px]"
          />
          <p className="mt-1 text-2xs text-muted-foreground">
            Use 0 para entrega gratuita.
          </p>
        </div>

        <div className="flex justify-end">
          <Button onClick={() => save.mutate()} loading={save.isPending} disabled={!org}>
            Salvar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function normalize(value: string | number): string {
  const n = typeof value === 'string' ? Number.parseFloat(value) : value;
  if (!Number.isFinite(n)) return '0,00';
  return n.toFixed(2).replace('.', ',');
}
