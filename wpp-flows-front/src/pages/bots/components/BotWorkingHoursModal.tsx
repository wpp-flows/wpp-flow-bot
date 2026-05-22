import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { Textarea } from '@/components/ui/Textarea';
import { botService } from '@/services/botService';
import { invalidateQueriesByFilters, queryKeys } from '@/lib/queryClient';
import { toast } from '@/stores/uiStore';
import { cn } from '@/lib/utils';
import type { BotInstance } from '@/types';

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const;

interface Props {
  bot: BotInstance | null;
  open: boolean;
  onClose: () => void;
}

export function BotWorkingHoursModal({ bot, open, onClose }: Readonly<Props>) {
  const qc = useQueryClient();
  const [days, setDays] = useState<number[]>([]);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!open || !bot) return;
    setDays(bot.workingDaysOfWeek);
    setStartTime(bot.workingStartTime ?? '');
    setEndTime(bot.workingEndTime ?? '');
    setMessage(bot.outOfHoursMessage ?? '');
  }, [bot, open]);

  const save = useMutation({
    mutationFn: () => {
      if (!bot) throw new Error('no bot');
      return botService.update({
        id: bot.id,
        workingDaysOfWeek: days,
        workingStartTime: startTime.trim() || null,
        workingEndTime: endTime.trim() || null,
        outOfHoursMessage: message.trim() || null,
      });
    },
    onSuccess: () => {
      void invalidateQueriesByFilters(qc, [{ queryKey: queryKeys.bots.all }]);
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
      description="Defina quando o bot responde mensagens. Fora desse período, o cliente recebe a mensagem configurada abaixo."
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
          <FormField label="Abre às" htmlFor="bot-start">
            <Input
              id="bot-start"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </FormField>
          <FormField label="Fecha às" htmlFor="bot-end">
            <Input
              id="bot-end"
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

        <FormField
          label="Mensagem fora do horário (opcional)"
          htmlFor="bot-ooh-msg"
          hint="Se vazio, o bot monta uma mensagem padrão com os dias e horários."
        >
          <Textarea
            id="bot-ooh-msg"
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ex: Não estamos no momento, atendemos de segunda a sexta das 08:00 às 17:00."
          />
        </FormField>
      </div>
    </Modal>
  );
}
