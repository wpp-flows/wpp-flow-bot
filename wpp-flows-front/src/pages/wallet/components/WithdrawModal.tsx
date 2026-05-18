import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';
import { walletService } from '@/services/walletService';
import { toast } from '@/stores/uiStore';
import { formatBRL } from '../wallet-helpers';

interface Props {
  open: boolean;
  onClose: () => void;
  balance: string;
  onCompleted: () => void;
}

export function WithdrawModal({ open, onClose, balance, onCompleted }: Props) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const withdraw = useMutation({
    mutationFn: walletService.requestWithdrawal,
    onSuccess: () => {
      onCompleted();
      toast.success('Saque solicitado');
      onClose();
      setAmount('');
      setNote('');
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : 'Falha ao solicitar saque'),
  });

  const submit = () => {
    const value = Number.parseFloat(amount.replace(',', '.'));
    if (!Number.isFinite(value) || value <= 0) {
      toast.error('Informe um valor válido.');
      return;
    }
    withdraw.mutate({ amount: value, note: note.trim() || undefined });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Solicitar saque"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button loading={withdraw.isPending} onClick={submit}>
            Confirmar saque
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3 py-1">
        <FormField label="Valor (R$)" htmlFor="wd-amount" required>
          <Input
            id="wd-amount"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0,00"
          />
        </FormField>
        <FormField label="Observação" htmlFor="wd-note">
          <Textarea
            id="wd-note"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Opcional: chave PIX, motivo, etc."
          />
        </FormField>
        <p className="text-xs text-muted-foreground">
          Saldo disponível:{' '}
          <span className="font-mono">{formatBRL(balance)}</span>.
        </p>
      </div>
    </Modal>
  );
}
