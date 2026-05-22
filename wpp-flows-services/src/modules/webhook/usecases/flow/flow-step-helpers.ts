import type { FlowState } from "@/modules/chat/repositories/chat-repo";
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

export function previousStep(
    steps: FlowStep[],
    currentId: string,
): FlowStep | null {
    const idx = steps.findIndex((s) => s.id === currentId);
    if (idx <= 0) return null;
    return steps[idx - 1] ?? null;
}

export function findFirstStepOfType(
    steps: FlowStep[],
    type: FlowStep["type"],
): FlowStep | null {
    return steps.find((s) => s.type === type) ?? null;
}

export function phaseForStep(step: FlowStep): FlowState["phase"] {
    if (step.type === "MENU") return "CATEGORY";
    if (step.type === "CONFIRMATION") return "CONFIRMATION";
    return "DONE";
}

export function isInteractiveStep(type: FlowStep["type"]): boolean {
    return (
        type === "MENU" ||
        type === "CONFIRMATION" ||
        type === "INPUT" ||
        type === "PAYMENT"
    );
}

/**
 * Reads the input field key from a step's metadata, falling back to "value"
 * when the editor hasn't assigned a key. Stable across edits because the key
 * lives in metadata, not on the step row itself.
 */
export function readInputFieldKey(step: FlowStep): string {
    const key = (step.metadata as { fieldKey?: unknown } | null)?.fieldKey;
    return typeof key === "string" && key.trim() ? key.trim() : "value";
}

export function readPaymentCancelMessage(step: FlowStep): string {
    const raw = (step.metadata as { cancelMessage?: unknown } | null)
        ?.cancelMessage;
    if (typeof raw === "string" && raw.trim()) return raw.trim();
    return "Que pena, quem sabe na próxima! Seu pedido foi cancelado.";
}

export function readPaymentTimeoutMessage(step: FlowStep): string {
    const raw = (step.metadata as { timeoutMessage?: unknown } | null)
        ?.timeoutMessage;
    if (typeof raw === "string" && raw.trim()) return raw.trim();
    return "Seu pedido demorou demais para ser pago e foi cancelado. Quando quiser, é só chamar de novo!";
}

export function readPaymentTimeoutMinutes(step: FlowStep): number {
    const raw = (step.metadata as { timeoutMinutes?: unknown } | null)
        ?.timeoutMinutes;
    if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) return raw;
    if (typeof raw === "string") {
        const parsed = Number.parseInt(raw, 10);
        if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
    return 15;
}
