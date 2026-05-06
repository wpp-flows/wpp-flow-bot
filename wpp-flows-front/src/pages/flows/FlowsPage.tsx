import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Code2, Plus, Save, Workflow as WorkflowIcon } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Tabs } from '@/components/ui/Tabs';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { flowService } from '@/services/flowService';
import { queryKeys } from '@/lib/queryClient';
import { toast } from '@/stores/uiStore';
import { generateId } from '@/lib/utils';
import type { Flow, FlowStep } from '@/types';
import { StepNode } from './components/StepNode';
import { JsonPreview } from './components/JsonPreview';

type ViewMode = 'editor' | 'json';

export function FlowsPage() {
  const qc = useQueryClient();
  const flows = useQuery({ queryKey: queryKeys.flows.all, queryFn: flowService.list });

  const [activeFlowId, setActiveFlowId] = useState<string | null>(null);
  const [steps, setSteps] = useState<FlowStep[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>('editor');

  const activeFlow = useMemo(
    () => flows.data?.find((f) => f.id === activeFlowId) ?? flows.data?.[0],
    [flows.data, activeFlowId],
  );

  useEffect(() => {
    if (activeFlow) {
      setActiveFlowId(activeFlow.id);
      setSteps(activeFlow.steps);
    }
  }, [activeFlow]);

  const isDirty = useMemo(() => {
    if (!activeFlow) return false;
    return JSON.stringify(steps) !== JSON.stringify(activeFlow.steps);
  }, [steps, activeFlow]);

  const save = useMutation({
    mutationFn: () => flowService.saveSteps(activeFlow!.id, steps),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.flows.all });
      toast.success('Flow saved', `${activeFlow!.name} updated successfully.`);
    },
    onError: () => toast.error('Could not save', 'Please try again.'),
  });

  const createFlow = useMutation({
    mutationFn: () =>
      flowService.create({ name: `New flow ${(flows.data?.length ?? 0) + 1}` }),
    onSuccess: (flow) => {
      qc.invalidateQueries({ queryKey: queryKeys.flows.all });
      setActiveFlowId(flow.id);
      toast.success('Flow created', `${flow.name} is ready to edit.`);
    },
  });

  const updateStep = (idx: number, next: FlowStep) =>
    setSteps((prev) => prev.map((s, i) => (i === idx ? next : s)));

  const removeStep = (idx: number) =>
    setSteps((prev) => prev.filter((_, i) => i !== idx));

  const addStep = () => {
    const id = generateId('step');
    const newStep: FlowStep = {
      id,
      type: 'message',
      title: 'New message',
      content: 'Add what the bot should say at this step.',
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
      list.splice(toIdx, 0, moved);
      return list;
    });
    setDraggingId(null);
    setOverId(null);
  };

  const flowForPreview: Flow | null = activeFlow ? { ...activeFlow, steps } : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Flow builder"
        description="Define the step-by-step conversation your bot will follow. Each step is a node — drag to reorder, click to edit."
        actions={
          <>
            <Button variant="outline" leftIcon={<Plus />} onClick={() => createFlow.mutate()} loading={createFlow.isPending}>
              New flow
            </Button>
            <Button
              leftIcon={<Save />}
              disabled={!isDirty}
              loading={save.isPending}
              onClick={() => save.mutate()}
            >
              {isDirty ? 'Save changes' : 'Saved'}
            </Button>
          </>
        }
      />

      {flows.isLoading ? (
        <Skeleton className="h-[600px] rounded-xl" />
      ) : !activeFlow ? (
        <EmptyState
          icon={<WorkflowIcon />}
          title="No flows yet"
          description="Flows define how your bot guides each customer through ordering. Start with the default template."
          action={
            <Button leftIcon={<Plus />} onClick={() => createFlow.mutate()}>
              Create your first flow
            </Button>
          }
        />
      ) : (
        <>
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CardTitle>{activeFlow.name}</CardTitle>
                    {activeFlow.isDefault ? (
                      <Badge tone="primary" size="sm">
                        Default
                      </Badge>
                    ) : null}
                  </div>
                  <CardDescription>
                    {activeFlow.description ?? 'Sequential WhatsApp flow.'} · {steps.length} step
                    {steps.length === 1 ? '' : 's'}
                  </CardDescription>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    value={activeFlow.id}
                    onChange={(e) => setActiveFlowId(e.target.value)}
                    className="w-44"
                  >
                    {flows.data?.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
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

          {view === 'editor' ? (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_460px]">
              <div className="space-y-3">
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
                      expanded={!!expanded[step.id]}
                      onToggle={() => toggleExpanded(step.id)}
                      onChange={(next) => updateStep(idx, next)}
                      onRemove={() => removeStep(idx)}
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
                  Add step
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
  );
}
