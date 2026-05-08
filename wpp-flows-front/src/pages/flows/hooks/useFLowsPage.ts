import { useMutation, useQueryClient } from '@tanstack/react-query';
import { flowService } from '@/services/flowService';
import { queryKeys } from '@/lib/queryClient';
import { toast } from '@/stores/uiStore';
import type { Flow, FlowStep, FlowStepInput } from '@/types';

interface UseFLowsPageParams {
  activeFlowId?: string;
  steps: FlowStep[];
  flowCount: number;
  setActiveFlowId: (id: string | null) => void;
  setConfirmDeleteOpen: (open: boolean) => void;
}

const stepsAsInput = (list: FlowStep[]): FlowStepInput[] =>
  list.map((s, i) => ({
    type: s.type,
    content: s.content,
    order: i,
    metadata: s.metadata ?? null,
  }));

export function useFLowsPage({
  activeFlowId,
  steps,
  flowCount,
  setActiveFlowId,
  setConfirmDeleteOpen,
}: Readonly<UseFLowsPageParams>) {
  const qc = useQueryClient();

  const save = useMutation({
    mutationFn: () => flowService.saveSteps(activeFlowId!, stepsAsInput(steps)),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: queryKeys.flows.all });
      qc.setQueryData(queryKeys.flows.detail(updated.id), updated);
      toast.success('Flow salvo', `${updated.name} v${updated.version} atualizado.`);
    },
    onError: () => toast.error('Não foi possível salvar', 'Tente novamente.'),
  });

  const newVersion = useMutation({
    mutationFn: () =>
      flowService.newVersion(activeFlowId!, {
        steps: stepsAsInput(steps),
        activate: false,
      }),
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: queryKeys.flows.all });
      setActiveFlowId(created.id);
      toast.success('Nova versão criada', `${created.name} v${created.version}`);
    },
  });

  const activate = useMutation({
    mutationFn: () => flowService.activate(activeFlowId!),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: queryKeys.flows.all });
      qc.setQueryData(queryKeys.flows.detail(updated.id), updated);
      toast.success('Flow ativado', `${updated.name} v${updated.version} está em produção.`);
    },
  });

  const createFlow = useMutation({
    mutationFn: () =>
      flowService.create({
        name: `Novo flow ${flowCount + 1}`,
        steps: [{ type: 'MESSAGE', order: 0, content: 'Olá! Bem-vindo ao nosso restaurante 👋' }],
      }),
    onSuccess: (flow) => {
      qc.invalidateQueries({ queryKey: queryKeys.flows.all });
      setActiveFlowId(flow.id);
      toast.success('Flow criado', `${flow.name} pronto para editar.`);
    },
    onError: (err: Error) => toast.error('Não foi possível criar o flow', err.message),
  });

  const deleteFlow = useMutation({
    mutationFn: (id: string) => flowService.remove(id),
    onSuccess: async (_, deletedId) => {
      setConfirmDeleteOpen(false);
      qc.removeQueries({ queryKey: queryKeys.flows.detail(deletedId) });
      await qc.invalidateQueries({ queryKey: queryKeys.flows.all });
      const list = qc.getQueryData<Flow[]>(queryKeys.flows.all);
      const nextId = list?.[0]?.id ?? null;
      setActiveFlowId(nextId);
      toast.success('Flow excluído', 'O flow foi removido permanentemente.');
    },
    onError: (err: Error) => toast.error('Não foi possível excluir o flow', err.message),
  });

  return { save, newVersion, activate, createFlow, deleteFlow };
}
