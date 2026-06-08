import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Clock, Save } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { authService } from '@/services/authService';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/stores/uiStore';
import { ApiError } from '@/instances/api';
import { cn } from '@/lib/utils';

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const;

export function LocalSettingsPage() {
  const { organization, refreshOrganization } = useAuth();
  const [days, setDays] = useState<number[]>([]);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!organization) return;
    setDays(organization.localWorkingDaysOfWeek ?? []);
    setStartTime(organization.localWorkingStartTime ?? '');
    setEndTime(organization.localWorkingEndTime ?? '');
    setMessage(organization.localOutOfHoursMessage ?? '');
  }, [organization]);

  const save = useMutation({
    mutationFn: () =>
      authService.updateOrganization({
        localWorkingDaysOfWeek: days,
        localWorkingStartTime: startTime.trim() || null,
        localWorkingEndTime: endTime.trim() || null,
        localOutOfHoursMessage: message.trim() || null,
      }),
    onSuccess: async () => {
      await refreshOrganization();
      toast.success('Horário do salão atualizado');
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.message : 'Falha ao salvar',
      ),
  });

  const toggleDay = (d: number) =>
    setDays((prev) =>
      prev.includes(d)
        ? prev.filter((x) => x !== d)
        : [...prev, d].sort((a, b) => a - b),
    );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Configurações do Salão"
        description="Horário de atendimento exclusivo do salão. Quando vazio, usamos o mesmo horário do delivery."
        info={
          <div className="space-y-2">
            <p className="font-medium tracking-tight text-foreground">
              Independente do delivery.
            </p>
            <p className="text-muted-foreground">
              Útil quando o salão fecha mais cedo (ou abre mais tarde) que
              a entrega. Cada campo vazio aqui herda o valor do horário
              de delivery — então não precisa preencher nada se os dois
              lados operam no mesmo horário.
            </p>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Horário de atendimento
          </CardTitle>
          <CardDescription>
            Quando o salão está fora desse horário, o cardápio da mesa
            bloqueia novos pedidos e mostra a mensagem abaixo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="mb-2 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
              Dias da semana
            </p>
            <div className="flex flex-wrap gap-2">
              {DAY_LABELS.map((label, idx) => {
                const active = days.includes(idx);
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => toggleDay(idx)}
                    className={cn(
                      'rounded-full border px-3 py-1 text-xs font-medium transition',
                      active
                        ? 'border-teal-500 bg-teal-500/10 text-teal-700 dark:text-teal-300'
                        : 'border-border bg-card text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <p className="mt-1 text-2xs text-muted-foreground">
              Vazio = usa os dias do delivery.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField label="Abre às" htmlFor="local-start">
              <Input
                id="local-start"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </FormField>
            <FormField label="Fecha às" htmlFor="local-end">
              <Input
                id="local-end"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </FormField>
          </div>

          <FormField
            label="Mensagem fora do horário (opcional)"
            htmlFor="local-msg"
            hint="Aparece para o cliente no QR da mesa quando o salão está fechado. Variáveis: {{days_of_work}}, {{from}}, {{to}}."
          >
            <Textarea
              id="local-msg"
              rows={3}
              placeholder="Estamos fechados no momento. Trabalhamos {{days_of_work}} das {{from}} às {{to}}."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </FormField>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          leftIcon={<Save />}
          onClick={() => save.mutate()}
          loading={save.isPending}
          disabled={!organization}
        >
          Salvar
        </Button>
      </div>
    </div>
  );
}
