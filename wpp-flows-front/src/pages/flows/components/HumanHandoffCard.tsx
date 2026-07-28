import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Headset, Save } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { TemplateEditor } from '@/components/messaging/TemplateEditor';
import { useAuth } from '@/hooks/useAuth';
import { authService } from '@/services/authService';
import { toast } from '@/stores/uiStore';

export const HANDOFF_DEFAULT_KEYWORD = 'atendente';
export const HANDOFF_DEFAULT_MESSAGE =
  'Certo, {{customer_name}}! Chamei um atendente — ele vai te responder por aqui em instantes 👋';

const HANDOFF_VARIABLES = [
  {
    key: 'customer_name',
    label: 'Nome do cliente',
    description: 'Nome exibido do cliente no WhatsApp.',
  },
];

interface Props {
  /** Reflete cada tecla no preview do WhatsApp ao lado. */
  onLiveChange?: (live: { keyword: string; message: string }) => void;
}

/**
 * Configuração do atendimento humano, editada junto do flow porque é aqui que
 * o restaurante escreve a mensagem que ensina a keyword ("escreva *atendente*").
 * O valor é da organização (vale para todos os flows/versões) — por isso o
 * save é próprio, separado do salvar do flow.
 */
export function HumanHandoffCard({ onLiveChange }: Readonly<Props>) {
  const { organization, refreshOrganization } = useAuth();
  const [keywords, setKeywords] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    setKeywords((organization?.humanHandoffKeywords ?? []).join(', '));
    setMessage(organization?.humanHandoffMessage ?? '');
  }, [organization]);

  useEffect(() => {
    const first = keywords.split(',')[0]?.trim() || HANDOFF_DEFAULT_KEYWORD;
    onLiveChange?.({
      keyword: first,
      message: message.trim() || HANDOFF_DEFAULT_MESSAGE,
    });
  }, [keywords, message, onLiveChange]);

  const isDirty =
    keywords !== (organization?.humanHandoffKeywords ?? []).join(', ') ||
    message !== (organization?.humanHandoffMessage ?? '');

  const save = useMutation({
    mutationFn: () =>
      authService.updateOrganization({
        humanHandoffKeywords: keywords
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean)
          .slice(0, 10),
        humanHandoffMessage: message.trim() === '' ? null : message.trim(),
      }),
    onSuccess: async () => {
      await refreshOrganization();
      toast.success('Atendimento humano salvo');
    },
    onError: (err) =>
      toast.error('Falha ao salvar', err instanceof Error ? err.message : undefined),
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Headset className="size-4 text-muted-foreground" />
          <CardTitle>Atendimento humano</CardTitle>
          <Badge tone="neutral" size="sm">
            vale para todos os flows
          </Badge>
        </div>
        <CardDescription>
          Quando a mensagem do cliente contém uma das palavras-chave, o bot
          pausa nessa conversa, você é notificado em tempo real e responde pela
          aba Conversas. Dica: mencione a palavra-chave na mensagem do flow
          acima, para o cliente saber como pedir ajuda.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="flow-handoff-keywords">Palavras-chave</Label>
          <Input
            id="flow-handoff-keywords"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="atendente, falar com alguém"
          />
          <p className="mt-1 text-2xs text-muted-foreground">
            Separe por vírgula (até 10). Sem diferença de maiúsculas ou acentos.
            Em branco usa <b>{HANDOFF_DEFAULT_KEYWORD}</b>.
          </p>
        </div>
        <TemplateEditor
          id="flow-handoff-message"
          label="Confirmação enviada ao cliente"
          hint="Em branco usa o texto padrão."
          placeholder={HANDOFF_DEFAULT_MESSAGE}
          value={message}
          onChange={setMessage}
          variables={HANDOFF_VARIABLES}
        />
        <div className="flex justify-end">
          <Button
            size="sm"
            leftIcon={<Save />}
            disabled={!isDirty || !organization}
            loading={save.isPending}
            onClick={() => save.mutate()}
          >
            Salvar atendimento
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
