import type { FlowStep } from "@/modules/flow/repositories/flow-repo";

export function sortSteps(steps: FlowStep[]): FlowStep[] {
    return [...steps].sort((a, b) => a.order - b.order);
}

export function findStep(steps: FlowStep[], id: string | null): FlowStep | null {
    if (!id) return null;
    return steps.find((s) => s.id === id) ?? null;
}

export function nextStep(steps: FlowStep[], currentId: string): FlowStep | null {
    const idx = steps.findIndex((s) => s.id === currentId);
    if (idx < 0) return null;
    return steps[idx + 1] ?? null;
}
