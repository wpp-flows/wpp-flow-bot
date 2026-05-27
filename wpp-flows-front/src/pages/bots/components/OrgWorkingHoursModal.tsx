import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { authService } from '@/services/authService';
import { useAuthStore } from '@/stores/authStore';
import { toast } from '@/stores/uiStore';
import { cn } from '@/lib/utils';
import type { Organization } from '@/types';

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const;

interface Props {
  organization: Organization | null;
  open: boolean;
  onClose: () => void;
}

export function OrgWorkingHoursModal({ organization, open, onClose }: Readonly<Props>) {
  const refreshOrganization = useAuthStore((s) => s.refreshOrganization);
  const [days, setDays] = useState<number[]>([]);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  useEffect(() => {
    if (!open || !organization) return;
    setDays(organization.workingDaysOfWeek);
    setStartTime(organization.workingStartTime ?? '');
    setEndTime(organization.workingEndTime ?? '');
  }, [organization, open]);

  const save = useMutation({
    mutationFn: () =>
      authService.updateOrganization({
        workingDaysOfWeek: days,
        workingStartTime: startTime.trim() || null,
        workingEndTime: endTime.trim() || null,
      }),
    onSuccess: async () => {
      await refreshOrganization();
      toast.success('Horários atualizados');
      onClose();
    },
    onError: (err) =>
      toast.error('Falha ao salvar', err instanceof Error ? err.message : undefined),
  });

  const toggleDay = (d: number) =>
    setDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort((a, b) => a - b),
    );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Horário de atendimento"
      description="Vale para todos os bots e para o cardápio digital. Fora desse período, clientes recebem a mensagem configurada abaixo e o cardápio bloqueia novos pedidos."
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button loading={save.isPending} onClick={() => save.mutate()}>
            Salvar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4 py-1">
        <FormField label="Dias de atendimento" htmlFor="">
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

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Abre às" htmlFor="org-start">
            <Input
              id="org-start"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </FormField>
          <FormField label="Fecha às" htmlFor="org-end">
            <Input
              id="org-end"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </FormField>
        </div>
        <p className="-mt-2 text-2xs text-muted-foreground">
          Deixe ambos em branco para atendimento 24h nos dias selecionados. Para
          horários que viram a meia-noite (ex: 22:00 → 06:00) o sistema entende
          como noite-adentro.
        </p>

        <p className="-mt-2 text-2xs text-muted-foreground">
          A mensagem enviada fora do horário é configurada em{' '}
          <strong>Mensagens → Fora do horário de atendimento</strong>.
        </p>
      </div>
    </Modal>
  );
}
