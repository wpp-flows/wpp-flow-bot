import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Code2, Plus, Save, Trash2, Workflow as WorkflowIcon, Zap } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Tabs } from '@/components/ui/Tabs';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { flowService } from '@/services/flowService';
import { menuService } from '@/services/menuService';
import { queryKeys } from '@/lib/queryClient';
import { generateId } from '@/lib/utils';
import type { FlowStep, FlowStepOption, MenuCategory } from '@/types';
import { StepNode } from './components/StepNode';
import { JsonPreview } from './components/JsonPreview';
import { useFLowsPage } from './hooks/useFLowsPage';

type ViewMode = 'editor' | 'json';

function slugFromCategoryName(name: string): string {
  const slug = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  return slug || 'option';
}

function menuOptionsFromCategories(categories: MenuCategory[]): FlowStepOption[] {
  return categories.map((category) => ({
    id: category.id,
    label: category.name,
    value: slugFromCategoryName(category.name),
  }));
}

export function FlowsPage() {
  const flows = useQuery({ queryKey: queryKeys.flows.all, queryFn: flowService.list });
  const menuCategories = useQuery({
    queryKey: queryKeys.menu.categories,
    queryFn: menuService.listCategories,
  });

  const [activeFlowId, setActiveFlowId] = useState<string | null>(null);
  const [steps, setSteps] = useState<FlowStep[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>('editor');
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const activeFlowSummary = useMemo(
    () => flows.data?.find((f) => f.id === activeFlowId) ?? flows.data?.[0],
    [flows.data, activeFlowId],
  );

  const activeFlowDetail = useQuery({
    queryKey: activeFlowSummary
      ? queryKeys.flows.detail(activeFlowSummary.id)
      : (['flow-noop'] as const),
    queryFn: () => flowService.getById(activeFlowSummary!.id),
    enabled: !!activeFlowSummary,
  });

  useEffect(() => {
    if (activeFlowSummary) setActiveFlowId(activeFlowSummary.id);
  }, [activeFlowSummary]);

  useEffect(() => {
    if (activeFlowDetail.data) setSteps(activeFlowDetail.data.steps);
  }, [activeFlowDetail.data]);

  const menuCategoryOptions = useMemo(
    () => menuOptionsFromCategories(menuCategories.data ?? []),
    [menuCategories.data],
  );

  const isDirty = useMemo(() => {
    if (!activeFlowDetail.data) return false;
    return JSON.stringify(steps) !== JSON.stringify(activeFlowDetail.data.steps);
  }, [steps, activeFlowDetail.data]);

  const { save, newVersion, activate, createFlow, deleteFlow } = useFLowsPage({
    activeFlowId: activeFlowDetail.data?.id,
    steps,
    flowCount: flows.data?.length ?? 0,
    setActiveFlowId,
    setConfirmDeleteOpen,
  });

  const updateStep = (idx: number, next: FlowStep) =>
    setSteps((prev) => prev.map((s, i) => (i === idx ? next : s)));

  const removeStep = (idx: number) =>
    setSteps((prev) => prev.filter((_, i) => i !== idx));

  const moveStep = (from: number, to: number) =>
    setSteps((prev) => {
      if (to < 0 || to >= prev.length) return prev;
      const list = [...prev];
      const [moved] = list.splice(from, 1);
      if (!moved) return prev;
      list.splice(to, 0, moved);
      return list;
    });

  const addStep = () => {
    const id = generateId('step');
    const newStep: FlowStep = {
      id,
      flowId: activeFlowDetail.data?.id ?? '',
      type: 'MESSAGE',
      order: steps.length,
      content: 'Digite o que o bot deve dizer neste passo.',
      metadata: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setSteps((prev) => [...prev, newStep]);
    setExpanded((prev) => ({ ...prev, [id]: true }));
  };

  const toggleExpanded = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const handleDrop = (targetId: string) => {
    if (!draggingId || draggingId === targetId) {
      setDraggingId(null);
      setOverId(null);
      return;
    }
    setSteps((prev) => {
      const ids = prev.map((s) => s.id);
      const fromIdx = ids.indexOf(draggingId);
      const toIdx = ids.indexOf(targetId);
      if (fromIdx < 0 || toIdx < 0) return prev;
      const list = [...prev];
      const [moved] = list.splice(fromIdx, 1);
      if (!moved) return prev;
      list.splice(toIdx, 0, moved);
      return list;
    });
    setDraggingId(null);
    setOverId(null);
  };

  const flowForPreview = activeFlowDetail.data
    ? { ...activeFlowDetail.data, steps }
    : null;

  return (
    <>
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Construtor de flows"
        description="Defina a conversa passo a passo que o bot vai seguir. Cada passo é um nó — arraste para reordenar e clique para editar."
        actions={
          <>
            <Button
              variant="outline"
              leftIcon={<Trash2 />}
              disabled={!activeFlowDetail.data || activeFlowDetail.data.isActive}
              title={
                activeFlowDetail.data?.isActive
                  ? 'Ative outro flow antes de excluir este.'
                  : undefined
              }
              onClick={() => setConfirmDeleteOpen(true)}
            >
              Excluir flow
            </Button>
            <Button variant="outline" leftIcon={<Plus />} onClick={() => createFlow.mutate()} loading={createFlow.isPending}>
              Novo flow
            </Button>
            <Button
              variant="outline"
              leftIcon={<Zap />}
              disabled={!activeFlowDetail.data || activeFlowDetail.data.isActive}
              loading={activate.isPending}
              onClick={() => activate.mutate()}
            >
              Ativar
            </Button>
            <Button
              variant="outline"
              onClick={() => newVersion.mutate()}
              loading={newVersion.isPending}
              disabled={!activeFlowDetail.data}
            >
              Nova versão
            </Button>
            <Button
              leftIcon={<Save />}
              disabled={!isDirty}
              loading={save.isPending}
              onClick={() => save.mutate()}
            >
              {isDirty ? 'Salvar alterações' : 'Salvo'}
            </Button>
          </>
        }
      />

      {flows.isLoading ? (
        <Skeleton className="h-[600px] rounded-xl" />
      ) : !activeFlowSummary ? (
        <EmptyState
          icon={<WorkflowIcon />}
          title="Nenhum flow ainda"
          description="Os flows definem como o bot guia cada cliente. Crie um para começar."
          action={
            <Button leftIcon={<Plus />} onClick={() => createFlow.mutate()}>
              Criar primeiro flow
            </Button>
          }
        />
      ) : (
        <>
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CardTitle>{activeFlowSummary.name}</CardTitle>
                    <Badge tone="neutral" size="sm">
                      v{activeFlowSummary.version}
                    </Badge>
                    {activeFlowSummary.isActive ? (
                      <Badge tone="success" size="sm">
                        Ativo
                      </Badge>
                    ) : null}
                  </div>
                  <CardDescription>
                    Flow sequencial no WhatsApp · {steps.length}{' '}
                    {steps.length === 1 ? 'passo' : 'passos'}
                  </CardDescription>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    value={activeFlowSummary.id}
                    onChange={(e) => setActiveFlowId(e.target.value)}
                    className="w-full sm:w-60"
                  >
                    {flows.data?.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} · v{f.version}
                        {f.isActive ? ' (ativo)' : ''}
                      </option>
                    ))}
                  </Select>
                  <Tabs
                    value={view}
                    onValueChange={(v) => setView(v as ViewMode)}
                    items={[
                      { value: 'editor', label: 'Editor', icon: <WorkflowIcon /> },
                      { value: 'json', label: 'JSON', icon: <Code2 /> },
                    ]}
                  />
                </div>
              </div>
            </CardHeader>
          </Card>

          {activeFlowDetail.isLoading ? (
            <Skeleton className="h-[400px] rounded-xl" />
          ) : view === 'editor' ? (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_460px]">
              <div className="min-w-0 space-y-3">
                {steps.map((step, idx) => (
                  <div
                    key={step.id}
                    draggable
                    onDragStart={() => setDraggingId(step.id)}
                    onDragEnd={() => {
                      setDraggingId(null);
                      setOverId(null);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (draggingId && draggingId !== step.id) setOverId(step.id);
                    }}
                    onDragLeave={() =>
                      setOverId((prev) => (prev === step.id ? null : prev))
                    }
                    onDrop={() => handleDrop(step.id)}
                  >
                    <StepNode
                      step={step}
                      index={idx}
                      total={steps.length}
                      menuCategoryOptions={menuCategoryOptions}
                      menuCategoriesLoading={menuCategories.isLoading}
                      expanded={!!expanded[step.id]}
                      onToggle={() => toggleExpanded(step.id)}
                      onChange={(next) => updateStep(idx, next)}
                      onRemove={() => removeStep(idx)}
                      onMoveUp={() => moveStep(idx, idx - 1)}
                      onMoveDown={() => moveStep(idx, idx + 1)}
                      isDragging={draggingId === step.id}
                      isOver={overId === step.id}
                    />
                    {idx < steps.length - 1 ? (
                      <div className="flex items-center justify-center py-1">
                        <span className="h-3 w-px bg-border" />
                      </div>
                    ) : null}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addStep}
                  className="group flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card/40 px-4 py-4 text-sm font-medium text-muted-foreground transition-all hover:border-primary/50 hover:bg-primary-soft/40 hover:text-primary"
                >
                  <Plus className="h-4 w-4" />
                  Adicionar passo
                </button>
              </div>

              <div className="hidden xl:block">
                {flowForPreview ? <JsonPreview flow={flowForPreview} /> : null}
              </div>
            </div>
          ) : flowForPreview ? (
            <JsonPreview flow={flowForPreview} />
          ) : null}
        </>
      )}
    </div>

    <Modal
      open={confirmDeleteOpen}
      onClose={() => setConfirmDeleteOpen(false)}
      title="Excluir este flow?"
      description={
        activeFlowSummary
          ? `${activeFlowSummary.name} · v${activeFlowSummary.version} será removido permanentemente.`
          : undefined
      }
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={() => setConfirmDeleteOpen(false)}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            loading={deleteFlow.isPending}
            onClick={() => {
              if (activeFlowDetail.data?.id) deleteFlow.mutate(activeFlowDetail.data.id);
            }}
          >
            Sim, excluir
          </Button>
        </>
      }
    >
      <p className="text-sm text-muted-foreground">
        Não é possível excluir o flow ativo — ative outra versão antes. Esta ação não pode ser
        desfeita.
      </p>
    </Modal>
    </>
  );
}
