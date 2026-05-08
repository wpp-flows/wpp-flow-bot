import type { FlowStep, FlowStepType, NewStepInput } from "@/modules/flow/repositories/flow-repo";

export type UpdateFlowStepInput = Partial<{
    type: FlowStepType;
    content: string;
    order: number;
    metadata: Record<string, unknown> | null;
}>;

export interface FlowStepRepository {
    findByIdInOrg(organizationId: string, id: string): Promise<FlowStep | null>;
    create(flowId: string, data: NewStepInput): Promise<FlowStep>;
    update(id: string, data: UpdateFlowStepInput): Promise<FlowStep>;
    delete(id: string): Promise<void>;
    countByFlow(flowId: string): Promise<number>;
}
