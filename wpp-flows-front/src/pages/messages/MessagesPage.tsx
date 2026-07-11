import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { useAuth } from "@/hooks/useAuth";
import { authService } from "@/services/authService";
import { toast } from "@/stores/uiStore";
import type { Organization } from "@/types";
import { TemplateEditor } from "../../components/messaging/TemplateEditor";

const CANCEL_PLACEHOLDER =
  "Que pena, {{customer_name}}! Seu pedido foi cancelado.";
const TIMEOUT_PLACEHOLDER =
  "O tempo para pagamento expirou e seu pedido foi cancelado automaticamente.";
const RECEIVED_PLACEHOLDER =
  "✅ Pedido {{order_number}} confirmado, {{customer_name}}! Logo seu pedido estará em preparo.";
const OUT_OF_HOURS_PLACEHOLDER =
  "Estamos fora do horário de atendimento. Trabalhamos {{days_of_work}} das {{from}} até as {{to}}.";

const OUT_OF_HOURS_VARIABLES = [
  {
    key: "days_of_work",
    label: "Dias de atendimento",
    description: 'Dias da semana formatados (ex.: "de segunda a sexta").',
  },
  {
    key: "from",
    label: "Abre às",
    description: "Horário de abertura (HH:MM).",
  },
  {
    key: "to",
    label: "Fecha às",
    description: "Horário de fechamento (HH:MM).",
  },
];

interface FormState {
  paymentTimeoutMinutes: string;
  paymentCancelMessage: string;
  paymentTimeoutMessage: string;
  paymentReceivedMessage: string;
  outOfHoursMessage: string;
  botCooldownMinutes: string;
}

export function MessagesPage() {
  const { organization, refreshOrganization } = useAuth();
  const [form, setForm] = useState<FormState>(() => buildState(organization));

  useEffect(() => {
    setForm(buildState(organization));
  }, [organization]);

  const save = useMutation({
    mutationFn: () => {
      const timeoutMinutes = Number.parseInt(form.paymentTimeoutMinutes, 10);
      const cooldownMinutes = Number.parseInt(form.botCooldownMinutes, 10);
      return authService.updateOrganization({
        paymentTimeoutMinutes:
          Number.isFinite(timeoutMinutes) && timeoutMinutes > 0
            ? timeoutMinutes
            : undefined,
        botCooldownMinutes:
          Number.isFinite(cooldownMinutes) && cooldownMinutes >= 0
            ? cooldownMinutes
            : undefined,
        paymentCancelMessage: nullIfBlank(form.paymentCancelMessage),
        paymentTimeoutMessage: nullIfBlank(form.paymentTimeoutMessage),
        paymentReceivedMessage: nullIfBlank(form.paymentReceivedMessage),
        outOfHoursMessage: nullIfBlank(form.outOfHoursMessage),
      });
    },
    onSuccess: async () => {
      await refreshOrganization();
      toast.success("Mensagens salvas");
    },
    onError: (err) =>
      toast.error(
        "Falha ao salvar",
        err instanceof Error ? err.message : undefined,
      ),
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Mensagens"
        description="Mensagens automáticas enviadas no WhatsApp + janelas de tempo que regem o comportamento do bot."
        info={
          <div className="space-y-4">
            <p className="font-medium tracking-tight text-foreground">
              Como funciona a janela de 24h do WhatsApp oficial
            </p>
            <p className="text-muted-foreground">
              Pela regra da Meta, seus textos personalizados abaixo são enviados
              normalmente enquanto o cliente interagiu nas últimas <b>24 horas</b>{" "}
              (o que cobre praticamente todo pedido). Passado esse prazo, a
              plataforma envia automaticamente um <b>modelo aprovado</b> pela Meta
              com texto fixo no lugar — assim o cliente nunca fica sem o aviso.
            </p>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Cooldown do bot</CardTitle>
          <CardDescription>
            Tempo que o bot fica em silêncio na conversa após responder.
            Enquanto o cooldown está ativo, mensagens do cliente continuam
            chegando no painel (você consegue ver e responder), mas o bot não
            dispara o fluxo novamente — útil quando o cliente está conversando
            com seu atendimento sobre algo que não é um pedido.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Label htmlFor="msg-cooldown-minutes">Minutos</Label>
          <Input
            id="msg-cooldown-minutes"
            type="number"
            inputMode="numeric"
            min={0}
            max={1440}
            value={form.botCooldownMinutes}
            onChange={(e) =>
              setForm((f) => ({ ...f, botCooldownMinutes: e.target.value }))
            }
            className="max-w-[200px]"
          />
          <p className="mt-1 text-2xs text-muted-foreground">
            0 desativa o cooldown — o bot responde a cada mensagem.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tempo limite para pagamento</CardTitle>
          <CardDescription>
            Depois desse tempo sem confirmação do Mercado Pago, o pedido é
            cancelado automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Label htmlFor="msg-timeout-minutes">Minutos</Label>
          <Input
            id="msg-timeout-minutes"
            type="number"
            inputMode="numeric"
            min={1}
            max={180}
            value={form.paymentTimeoutMinutes}
            onChange={(e) =>
              setForm((f) => ({ ...f, paymentTimeoutMinutes: e.target.value }))
            }
            className="max-w-[200px]"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fora do horário de atendimento</CardTitle>
          <CardDescription>
            Enviada quando alguém manda mensagem fora do horário configurado em
            "Bots → Horário de atendimento". Use as variáveis para mencionar
            seus dias e horários sem ter que editar a mensagem quando mudarem.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TemplateEditor
            id="msg-out-of-hours"
            label="Mensagem"
            hint="Em branco usa um texto padrão construído a partir dos dias e horários."
            placeholder={OUT_OF_HOURS_PLACEHOLDER}
            value={form.outOfHoursMessage}
            onChange={(next) =>
              setForm((f) => ({ ...f, outOfHoursMessage: next }))
            }
            variables={OUT_OF_HOURS_VARIABLES}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pagamento confirmado</CardTitle>
          <CardDescription>
            Enviada quando o cliente toca em "Abrir conversa no WhatsApp" após o
            pagamento aprovado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TemplateEditor
            id="msg-received"
            label="Mensagem"
            hint="Em branco usa o texto padrão. Toque numa variável para inserir no cursor."
            placeholder={RECEIVED_PLACEHOLDER}
            value={form.paymentReceivedMessage}
            onChange={(next) =>
              setForm((f) => ({ ...f, paymentReceivedMessage: next }))
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cliente cancela o pedido</CardTitle>
          <CardDescription>
            Enviada quando o cliente toca em "Cancelar pedido" no checkout antes
            de pagar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TemplateEditor
            id="msg-cancel"
            label="Mensagem"
            hint="Em branco usa o texto padrão."
            placeholder={CANCEL_PLACEHOLDER}
            value={form.paymentCancelMessage}
            onChange={(next) =>
              setForm((f) => ({ ...f, paymentCancelMessage: next }))
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pagamento expirou</CardTitle>
          <CardDescription>
            Enviada quando o pedido é cancelado por exceder o tempo limite
            acima.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TemplateEditor
            id="msg-timeout"
            label="Mensagem"
            hint="Em branco usa o texto padrão."
            placeholder={TIMEOUT_PLACEHOLDER}
            value={form.paymentTimeoutMessage}
            onChange={(next) =>
              setForm((f) => ({ ...f, paymentTimeoutMessage: next }))
            }
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={() => save.mutate()}
          loading={save.isPending}
          disabled={!organization}
        >
          Salvar mensagens
        </Button>
      </div>
    </div>
  );
}

function buildState(org: Organization | null): FormState {
  return {
    paymentTimeoutMinutes: String(org?.paymentTimeoutMinutes ?? 15),
    paymentCancelMessage: org?.paymentCancelMessage ?? "",
    paymentTimeoutMessage: org?.paymentTimeoutMessage ?? "",
    paymentReceivedMessage: org?.paymentReceivedMessage ?? "",
    outOfHoursMessage: org?.outOfHoursMessage ?? "",
    botCooldownMinutes: String(org?.botCooldownMinutes ?? 60),
  };
}

function nullIfBlank(value: string): string | null {
  return value.trim() === "" ? null : value.trim();
}
