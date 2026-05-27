export type FlowStepType = "MESSAGE";

export interface FlowStep {
    id: string;
    flowId: string;
    type: FlowStepType;
    content: string;
    order: number;
    metadata: Record<string, unknown> | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface Flow {
    id: string;
    organizationId: string;
    name: string;
    isActive: boolean;
    version: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface FlowWithSteps extends Flow {
    steps: FlowStep[];
}

export interface NewStepInput {
    type: FlowStepType;
    content: string;
    order?: number;
    metadata?: Record<string, unknown> | null;
}

export interface FlowRepository {
    listByOrg(organizationId: string): Promise<Flow[]>;
    findActive(organizationId: string): Promise<FlowWithSteps | null>;
    findByIdInOrg(organizationId: string, id: string): Promise<FlowWithSteps | null>;
    findLatestVersion(
        organizationId: string,
        name: string
    ): Promise<Flow | null>;
    create(input: {
        organizationId: string;
        name: string;
        version: number;
        isActive: boolean;
        steps: NewStepInput[];
    }): Promise<FlowWithSteps>;
    updateName(id: string, name: string): Promise<Flow>;
    delete(id: string): Promise<void>;
    activate(organizationId: string, id: string): Promise<FlowWithSteps>;
    replaceSteps(flowId: string, steps: NewStepInput[]): Promise<FlowWithSteps>;
    reorderSteps(flowId: string, orderedIds: string[]): Promise<FlowWithSteps>;
}
