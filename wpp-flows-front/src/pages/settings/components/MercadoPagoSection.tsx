import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { authService } from '@/services/authService';
import { toast } from '@/stores/uiStore';
import type { Organization } from '@/types';
import { maskSecret } from '../settings-constants';
import { CredentialField } from './CredentialField';

type MercadoPagoField =
  | 'mercadoPagoAccessToken'
  | 'mercadoPagoPublicKey'
  | 'mercadoPagoWebhookSecret';

interface Props {
  organization: Organization | null;
  onUpdated: () => Promise<void> | void;
}

export function MercadoPagoSection({ organization: org, onUpdated }: Props) {
  const [accessToken, setAccessToken] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');

  const hasAccessToken = !!org?.mercadoPagoAccessToken;
  const hasPublicKey = !!org?.mercadoPagoPublicKey;
  const hasWebhookSecret = !!org?.mercadoPagoWebhookSecret;

  const save = useMutation({
    mutationFn: () =>
      authService.updateOrganization({
        // Only send the fields the user actually typed this session. An empty
        // input does NOT clear the server value — use the "Remover" button for that.
        ...(accessToken.trim() ? { mercadoPagoAccessToken: accessToken.trim() } : {}),
        ...(publicKey.trim() ? { mercadoPagoPublicKey: publicKey.trim() } : {}),
        ...(webhookSecret.trim() ? { mercadoPagoWebhookSecret: webhookSecret.trim() } : {}),
      }),
    onSuccess: async () => {
      await onUpdated();
      setAccessToken('');
      setPublicKey('');
      setWebhookSecret('');
      toast.success('Credenciais salvas');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Falha ao salvar'),
  });

  const clearField = useMutation({
    mutationFn: (field: MercadoPagoField) =>
      authService.updateOrganization({ [field]: null }),
    onSuccess: async () => {
      await onUpdated();
      toast.success('Credencial removida');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Falha ao remover'),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mercado Pago</CardTitle>
        <CardDescription>
          Cole as credenciais da sua conta Mercado Pago para que o bot envie links de pagamento aos clientes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <CredentialField
          label="Access Token"
          id="mp-access-token"
          value={accessToken}
          setValue={setAccessToken}
          hasSaved={hasAccessToken}
          savedHint={hasAccessToken ? maskSecret(org?.mercadoPagoAccessToken ?? '') : undefined}
          onClear={() => clearField.mutate('mercadoPagoAccessToken')}
          clearing={clearField.isPending}
          placeholder="APP_USR-..."
        />
        <CredentialField
          label="Public Key"
          id="mp-public-key"
          value={publicKey}
          setValue={setPublicKey}
          hasSaved={hasPublicKey}
          savedHint={hasPublicKey ? maskSecret(org?.mercadoPagoPublicKey ?? '') : undefined}
          onClear={() => clearField.mutate('mercadoPagoPublicKey')}
          clearing={clearField.isPending}
          placeholder="APP_USR-..."
        />
        <CredentialField
          label="Webhook secret"
          id="mp-webhook-secret"
          value={webhookSecret}
          setValue={setWebhookSecret}
          hasSaved={hasWebhookSecret}
          savedHint={hasWebhookSecret ? '••••' : undefined}
          onClear={() => clearField.mutate('mercadoPagoWebhookSecret')}
          clearing={clearField.isPending}
          placeholder="Cole o segredo copiado do painel do Mercado Pago"
          hint="Quando preenchido, o bot só processa webhooks assinados por este segredo."
        />
        <div className="rounded-md border border-dashed border-border bg-muted/30 p-3 text-2xs text-muted-foreground">
          URL para configurar no painel do Mercado Pago:{' '}
          <code className="break-all rounded bg-muted px-1 py-0.5 font-mono">
            https://api.placeconsult.com.br/webhook/mercadopago/{org?.id ?? '<organizationId>'}
          </code>
        </div>
        <div className="flex justify-end">
          <Button
            onClick={() => save.mutate()}
            loading={save.isPending}
            disabled={!accessToken && !publicKey && !webhookSecret}
          >
            Salvar credenciais
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
