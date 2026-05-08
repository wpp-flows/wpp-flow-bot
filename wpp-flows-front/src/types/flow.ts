export type FlowStepType = 'MESSAGE' | 'MENU' | 'CONFIRMATION' | 'PAYMENT';

export interface FlowStepOption {
  id: string;
  label: string;
  value: string;
}

export interface FlowStep {
  id: string;
  flowId: string;
  type: FlowStepType;
  content: string;
  order: number;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface Flow {
  id: string;
  organizationId: string;
  name: string;
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface FlowWithSteps extends Flow {
  steps: FlowStep[];
}

export interface FlowStepInput {
  type: FlowStepType;
  content: string;
  order?: number;
  metadata?: Record<string, unknown> | null;
}

export interface CreateFlowPayload {
  name: string;
  steps: FlowStepInput[];
  activate?: boolean;
}

export interface NewFlowVersionPayload {
  steps?: FlowStepInput[];
  activate?: boolean;
}
