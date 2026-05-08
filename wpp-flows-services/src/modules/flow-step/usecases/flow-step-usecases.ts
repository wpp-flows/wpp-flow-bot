import { NotFoundError } from "@/shared/exceptions/http";
import type { FlowRepository, FlowStep, NewStepInput } from "@/modules/flow/repositories/flow-repo";
import type { FlowStepRepository, UpdateFlowStepInput } from "../repositories/flow-step-repo";

export class CreateFlowStepUseCase {
    constructor(
        private readonly stepRepo: FlowStepRepository,
        private readonly flowRepo: FlowRepository
    ) {}

    async execute(input: {
        organizationId: string;
        flowId: string;
        step: NewStepInput;
    }): Promise<FlowStep> {
        const flow = await this.flowRepo.findByIdInOrg(
            input.organizationId,
            input.flowId
        );
        if (!flow) throw new NotFoundError("Flow");

        const order =
            input.step.order ?? (await this.stepRepo.countByFlow(input.flowId));

        return this.stepRepo.create(input.flowId, {
            ...input.step,
            order,
        });
    }
}

export class UpdateFlowStepUseCase {
    constructor(private readonly stepRepo: FlowStepRepository) {}

    async execute(input: {
        organizationId: string;
        id: string;
        data: UpdateFlowStepInput;
    }): Promise<FlowStep> {
        const step = await this.stepRepo.findByIdInOrg(input.organizationId, input.id);
        if (!step) throw new NotFoundError("Flow step");
        return this.stepRepo.update(input.id, input.data);
    }
}

export class DeleteFlowStepUseCase {
    constructor(private readonly stepRepo: FlowStepRepository) {}

    async execute(input: {
        organizationId: string;
        id: string;
    }): Promise<void> {
        const step = await this.stepRepo.findByIdInOrg(input.organizationId, input.id);
        if (!step) throw new NotFoundError("Flow step");
        await this.stepRepo.delete(input.id);
    }
}
