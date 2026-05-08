import { NotFoundError } from "@/shared/exceptions/http";
import type { FlowRepository, FlowStep, NewStepInput } from "@/modules/flow/repositories/flow-repo";
import type { CategoryRepository, MenuCategory } from "@/modules/menu/repositories/menu-repo";
import type { FlowStepRepository, UpdateFlowStepInput } from "../repositories/flow-step-repo";

function slugFromCategoryName(name: string): string {
    const s = name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "");
    return s || "option";
}

function menuMetadataFromCategories(categories: MenuCategory[]): Record<string, unknown> {
    return {
        options: categories.map((cat) => ({
            id: cat.id,
            label: cat.name,
            value: slugFromCategoryName(cat.name),
        })),
    };
}

export class CreateFlowStepUseCase {
    constructor(
        private readonly stepRepo: FlowStepRepository,
        private readonly flowRepo: FlowRepository,
        private readonly categoryRepo: CategoryRepository
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

        let stepPayload = input.step;
        if (input.step.type === "MENU") {
            const categories = await this.categoryRepo.listByOrg(input.organizationId);
            if (categories.length > 0) {
                stepPayload = {
                    ...input.step,
                    metadata: menuMetadataFromCategories(categories),
                };
            }
        }

        return this.stepRepo.create(input.flowId, {
            ...stepPayload,
            order,
        });
    }
}

export class UpdateFlowStepUseCase {
    constructor(
        private readonly stepRepo: FlowStepRepository,
        private readonly categoryRepo: CategoryRepository
    ) {}

    async execute(input: {
        organizationId: string;
        id: string;
        data: UpdateFlowStepInput;
    }): Promise<FlowStep> {
        const step = await this.stepRepo.findByIdInOrg(input.organizationId, input.id);
        if (!step) throw new NotFoundError("Flow step");

        const effectiveType = input.data.type ?? step.type;
        let data = input.data;
        if (effectiveType === "MENU") {
            const categories = await this.categoryRepo.listByOrg(input.organizationId);
            if (categories.length > 0) {
                data = {
                    ...input.data,
                    metadata: menuMetadataFromCategories(categories),
                };
            }
        }

        return this.stepRepo.update(input.id, data);
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
