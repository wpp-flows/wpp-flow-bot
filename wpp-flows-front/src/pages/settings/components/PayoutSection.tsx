import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { authService } from '@/services/authService';
import { toast } from '@/stores/uiStore';
import type { Organization, PayoutPixKeyType } from '@/types';
import { PIX_KEY_TYPES } from '../settings-constants';

interface Props {
  organization: Organization | null;
  onUpdated: () => Promise<void> | void;
}

export function PayoutSection({ organization: org, onUpdated }: Props) {
  const [pixKey, setPixKey] = useState(org?.payoutPixKey ?? '');
  const [pixKeyType, setPixKeyType] = useState<PayoutPixKeyType>(
    org?.payoutPixKeyType ?? 'cpf',
  );

  useEffect(() => {
    setPixKey(org?.payoutPixKey ?? '');
    setPixKeyType(org?.payoutPixKeyType ?? 'cpf');
  }, [org?.payoutPixKey, org?.payoutPixKeyType]);

  const save = useMutation({
    mutationFn: () =>
      authService.updateOrganization({
        payoutPixKey: pixKey.trim() ? pixKey.trim() : null,
        payoutPixKeyType: pixKey.trim() ? pixKeyType : null,
      }),
    onSuccess: async () => {
      await onUpdated();
      toast.success('Chave de saque salva');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Falha ao salvar'),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Saque automático (PIX)</CardTitle>
        <CardDescription>
          Quando você solicitar um saque na carteira, enviaremos o valor por PIX para esta chave usando sua conta Mercado Pago.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[200px_1fr]">
          <FormField label="Tipo da chave" htmlFor="pix-key-type">
            <Select
              id="pix-key-type"
              value={pixKeyType}
              onChange={(e) => setPixKeyType(e.target.value as PayoutPixKeyType)}
            >
              {PIX_KEY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Chave PIX" htmlFor="pix-key">
            <Input
              id="pix-key"
              value={pixKey}
              onChange={(e) => setPixKey(e.target.value)}
              placeholder={pixKeyType === 'email' ? 'voce@exemplo.com' : '...'}
            />
          </FormField>
        </div>
        <p className="text-2xs text-muted-foreground">
          Sem chave configurada, os saques ficam pendentes para aprovação manual.
        </p>
        <div className="flex justify-end">
          <Button onClick={() => save.mutate()} loading={save.isPending}>
            Salvar chave
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
