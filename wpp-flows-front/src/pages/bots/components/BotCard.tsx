import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MoreVertical, Trash2, RefreshCw, Phone, BadgeCheck, Bot, BotOff, Send } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { Textarea } from '@/components/ui/Textarea';
import { IconButton } from '@/components/ui/IconButton';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/feedback/StatusBadge';
import { botService } from '@/services/botService';
import { invalidateQueriesByFilters, queryKeys } from '@/lib/queryClient';
import { toast } from '@/stores/uiStore';
import { formatRelativeTime, cn } from '@/lib/utils';
import type { BotInstance } from '@/types';

export function BotCard({ bot }: Readonly<{ bot: BotInstance }>) {
  const qc = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const [testTo, setTestTo] = useState('');
  const [testText, setTestText] = useState('');

  const refresh = () => invalidateQueriesByFilters(qc, [{ queryKey: queryKeys.bots.all }]);

  const sendTest = useMutation({
    mutationFn: () => botService.sendTestMessage(bot.id, testTo.trim(), testText.trim() || undefined),
    onSuccess: () => {
      toast.success('Mensagem enviada', 'Confira no WhatsApp do destinatário.');
      setTestOpen(false);
      setTestText('');
    },
    onError: (err) => {
      const apiErr = err as { message?: string };
      toast.error('Falha ao enviar', apiErr.message ?? 'Verifique o número e a conexão.');
    },
  });

  const remove = useMutation({
    mutationFn: () => botService.remove(bot.id),
    onSuccess: () => {
      refresh();
      toast.success('Bot removido', `${bot.name} foi desconectado.`);
      setConfirmDelete(false);
    },
  });

  const toggleIsActive = useMutation({
    mutationFn: (next: boolean) => botService.setIsActive(bot.id, next),
    onSuccess: (_, next) => {
      refresh();
      toast.info(
        next
          ? 'Bot ativado — respostas automáticas retomadas em todas as conversas.'
          : 'Bot desativado — respostas automáticas pausadas em todas as conversas.',
      );
    },
    onError: (err) => {
      const apiErr = err as { message?: string };
      toast.error('Não foi possível alterar o bot', apiErr.message);
    },
  });

  const isOnline = bot.status === 'ONLINE';
  const identity = bot.verifiedName ?? bot.displayPhoneNumber ?? bot.phoneNumber ?? null;
  // Set by the backend when a Graph send got 401/403 — the restaurant revoked
  // or lost the authorization and must run "Conectar WhatsApp" again.
  const needsReauth = Boolean(bot.tokenStatus && bot.tokenStatus !== 'ACTIVE');

  return (
    <>
      <Card className="group relative transition-shadow hover:shadow-soft-md">
        <CardContent className="space-y-4 p-5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-3">
              <span
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-lg text-base font-semibold tracking-tight',
                  isOnline ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                )}
              >
                {bot.name.charAt(0)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold tracking-tight">{bot.name}</p>
                <p className="truncate text-2xs text-muted-foreground font-mono">{bot.id}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {needsReauth ? (
                <span
                  className="rounded-full bg-destructive-soft px-2 py-0.5 text-2xs font-medium text-destructive"
                  title="A autorização com a Meta expirou ou foi revogada. Use 'Conectar WhatsApp' para reautorizar este número."
                >
                  Reautorizar
                </span>
              ) : null}
              {!bot.isActive ? (
                <span className="rounded-full bg-warning-soft px-2 py-0.5 text-2xs font-medium text-warning">
                  Pausado
                </span>
              ) : null}
              <StatusBadge status={bot.status} size="sm" />
              <div className="relative">
                <IconButton
                  size="sm"
                  variant="ghost"
                  onClick={() => setMenuOpen((v) => !v)}
                  onBlur={() => setTimeout(() => setMenuOpen(false), 150)}
                  aria-label="Ações do bot"
                >
                  <MoreVertical />
                </IconButton>
                <div
                  className={cn(
                    'absolute right-0 top-full z-50 mt-1 w-56 rounded-lg border border-border bg-popover p-1 shadow-soft-md',
                    'origin-top-right transition-all duration-150',
                    menuOpen ? 'opacity-100 scale-100' : 'pointer-events-none opacity-0 scale-95',
                  )}
                >
                  <button
                    type="button"
                    onMouseDown={() => setTestOpen(true)}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium hover:bg-muted"
                  >
                    <Send className="h-3.5 w-3.5" />
                    Enviar mensagem de teste
                  </button>
                  <button
                    type="button"
                    onMouseDown={() => refresh()}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium hover:bg-muted"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Atualizar status
                  </button>
                  <button
                    type="button"
                    onMouseDown={() => setConfirmDelete(true)}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive-soft"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remover bot
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-3 w-3" />
              <span className="font-mono">{bot.displayPhoneNumber ?? bot.phoneNumber ?? 'Não atribuído'}</span>
            </div>
            {identity ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <BadgeCheck className="h-3 w-3" />
                <span>{identity}</span>
              </div>
            ) : null}
            <div className="flex items-center gap-2 text-muted-foreground">
              <RefreshCw className="h-3 w-3" />
              <span>
                {bot.lastConnectedAt
                  ? `Conectado ${formatRelativeTime(bot.lastConnectedAt)}`
                  : 'WhatsApp oficial (Meta)'}
              </span>
            </div>
          </div>

          {needsReauth ? (
            <p className="rounded-md border border-destructive/30 bg-destructive-soft px-3 py-2 text-2xs text-destructive text-pretty">
              A autorização com a Meta expirou ou foi revogada — as mensagens
              deste número não estão sendo enviadas. Clique em{' '}
              <b>Conectar WhatsApp</b> (no topo da página) e escolha este mesmo
              número para reautorizar.
            </p>
          ) : null}

          <div className="flex flex-col gap-2">
            <Button
              size="sm"
              variant={bot.isActive ? 'outline' : 'primary'}
              className="w-full"
              leftIcon={bot.isActive ? <BotOff /> : <Bot />}
              onClick={() => toggleIsActive.mutate(!bot.isActive)}
              loading={toggleIsActive.isPending}
              title={
                bot.isActive
                  ? 'Pausa as respostas automáticas do bot em todas as conversas, sem desconectar o WhatsApp.'
                  : 'Retoma as respostas automáticas do bot em todas as conversas.'
              }
            >
              {bot.isActive ? 'Desativar automação' : 'Ativar automação'}
            </Button>
            <p className="text-2xs text-muted-foreground text-pretty">
              {bot.isActive
                ? 'Desativar pausa as respostas automáticas em todas as conversas, sem desconectar o WhatsApp.'
                : 'Automação pausada — o WhatsApp permanece conectado.'}
            </p>
          </div>
        </CardContent>
      </Card>

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Remover este bot?"
        description={`${bot.name} será removido e as conversas arquivadas.`}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={() => remove.mutate()} loading={remove.isPending}>
              Sim, remover
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          Esta ação não pode ser desfeita. O número pode ser reconectado depois via Embedded Signup.
        </p>
      </Modal>

      <Modal
        open={testOpen}
        onClose={() => setTestOpen(false)}
        title="Enviar mensagem de teste"
        description="Envia um texto por este número para validar a conexão."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setTestOpen(false)}>
              Cancelar
            </Button>
            <Button
              leftIcon={<Send />}
              onClick={() => sendTest.mutate()}
              loading={sendTest.isPending}
              disabled={testTo.trim().length < 8}
            >
              Enviar
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <FormField label="Número do destinatário" htmlFor="test-to" required>
            <Input
              id="test-to"
              placeholder="+55 19 99999-9999"
              value={testTo}
              onChange={(e) => setTestTo(e.target.value)}
            />
          </FormField>
          <FormField
            label="Mensagem"
            htmlFor="test-text"
            hint="Opcional — deixe em branco para um texto padrão."
          >
            <Textarea
              id="test-text"
              rows={2}
              placeholder="Olá! Teste do WhatsApp oficial ✅"
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
            />
          </FormField>
          <p className="text-2xs text-muted-foreground text-pretty">
            No número de teste da Meta, o destinatário precisa estar na lista de
            números verificados (aba "Configuração da API" no painel da Meta).
          </p>
        </div>
      </Modal>
    </>
  );
}
