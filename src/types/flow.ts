export type FlowStepType = 'message' | 'menu' | 'item-selection' | 'confirmation' | 'payment';

export interface FlowStepOption {
  id: string;
  label: string;
  value: string;
  nextStepId?: string;
}

export interface FlowStep {
  id: string;
  type: FlowStepType;
  title: string;
  content: string;
  options?: FlowStepOption[];
}

export interface Flow {
  id: string;
  name: string;
  description?: string;
  isDefault: boolean;
  steps: FlowStep[];
  updatedAt: string;
  createdAt: string;
}

export interface CreateFlowPayload {
  name: string;
  description?: string;
}

export interface UpdateFlowPayload {
  id: string;
  name?: string;
  description?: string;
  steps?: FlowStep[];
}
