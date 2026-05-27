import { ConflictError, NotFoundError, ValidationError } from "@/shared/exceptions/http";
import type {
    Flow,
    FlowRepository,
    FlowWithSteps,
    NewStepInput,
} from "../repositories/flow-repo";
import type { CategoryRepository, MenuCategory } from "@/modules/menu/repositories/menu-repo";

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

export class ListFlowsUseCase {
    constructor(private readonly repo: FlowRepository) {}
    execute(organizationId: string): Promise<Flow[]> {
        return this.repo.listByOrg(organizationId);
    }
}

export class GetActiveFlowUseCase {
    constructor(private readonly repo: FlowRepository) {}
    execute(organizationId: string): Promise<FlowWithSteps | null> {
        return this.repo.findActive(organizationId);
    }
}

export class GetFlowUseCase {
    constructor(private readonly repo: FlowRepository) {}
    async execute(input: { organizationId: string; id: string }): Promise<FlowWithSteps> {
        const flow = await this.repo.findByIdInOrg(input.organizationId, input.id);
        if (!flow) throw new NotFoundError("Flow");
        return flow;
    }
}

export class CreateFlowUseCase {
    constructor(private readonly repo: FlowRepository) {}
    async execute(input: {
        organizationId: string;
        name: string;
        steps: NewStepInput[];
        activate?: boolean;
    }): Promise<FlowWithSteps> {
        const latest = await this.repo.findLatestVersion(input.organizationId, input.name);
        if (latest) {
            throw new ConflictError(
                `Flow named "${input.name}" already exists. Use new-version to bump version.`
            );
        }
        return this.repo.create({
            organizationId: input.organizationId,
            name: input.name,
            version: 1,
            isActive: input.activate ?? false,
            steps: input.steps.map((s, i) => ({ ...s, order: s.order ?? i })),
        });
    }
}

export class UpdateFlowUseCase {
    constructor(private readonly repo: FlowRepository) {}
    async execute(input: {
        organizationId: string;
        id: string;
        name: string;
    }): Promise<Flow> {
        const flow = await this.repo.findByIdInOrg(input.organizationId, input.id);
        if (!flow) throw new NotFoundError("Flow");

        if (input.name !== flow.name) {
            const sibling = await this.repo.findLatestVersion(
                input.organizationId,
                input.name
            );
            if (sibling) {
                throw new ConflictError(`Flow named "${input.name}" already exists.`);
            }
        }
        return this.repo.updateName(input.id, input.name);
    }
}

export class DeleteFlowUseCase {
    constructor(private readonly repo: FlowRepository) {}
    async execute(input: { organizationId: string; id: string }): Promise<void> {
        const flow = await this.repo.findByIdInOrg(input.organizationId, input.id);
        if (!flow) throw new NotFoundError("Flow");
        if (flow.isActive) {
            throw new ValidationError(
                "Cannot delete the active flow. Activate another flow first."
            );
        }
        await this.repo.delete(input.id);
    }
}

export class CreateNewFlowVersionUseCase {
    constructor(private readonly repo: FlowRepository) {}
    async execute(input: {
        organizationId: string;
        id: string;
        steps?: NewStepInput[];
        activate?: boolean;
    }): Promise<FlowWithSteps> {
        const source = await this.repo.findByIdInOrg(input.organizationId, input.id);
        if (!source) throw new NotFoundError("Flow");

        const latest = await this.repo.findLatestVersion(
            input.organizationId,
            source.name
        );
        const nextVersion = (latest?.version ?? source.version) + 1;

        const steps =
            input.steps ??
            source.steps.map((s) => ({
                type: s.type,
                content: s.content,
                order: s.order,
                metadata: s.metadata,
            }));

        return this.repo.create({
            organizationId: input.organizationId,
            name: source.name,
            version: nextVersion,
            isActive: input.activate ?? false,
            steps: steps.map((s, i) => ({ ...s, order: s.order ?? i })),
        });
    }
}

export class ActivateFlowUseCase {
    constructor(private readonly repo: FlowRepository) {}
    async execute(input: {
        organizationId: string;
        id: string;
    }): Promise<FlowWithSteps> {
        const flow = await this.repo.findByIdInOrg(input.organizationId, input.id);
        if (!flow) throw new NotFoundError("Flow");
        return this.repo.activate(input.organizationId, input.id);
    }
}

export class ReplaceFlowStepsUseCase {
    constructor(private readonly repo: FlowRepository) {}
    async execute(input: {
        organizationId: string;
        id: string;
        steps: NewStepInput[];
    }): Promise<FlowWithSteps> {
        const flow = await this.repo.findByIdInOrg(input.organizationId, input.id);
        if (!flow) throw new NotFoundError("Flow");
        const normalized = input.steps.map((s, i) => ({
            ...s,
            order: s.order ?? i,
        }));
        return this.repo.replaceSteps(input.id, normalized);
    }
}

export class ReorderFlowStepsUseCase {
    constructor(private readonly repo: FlowRepository) {}
    async execute(input: {
        organizationId: string;
        id: string;
        orderedIds: string[];
    }): Promise<FlowWithSteps> {
        const flow = await this.repo.findByIdInOrg(input.organizationId, input.id);
        if (!flow) throw new NotFoundError("Flow");

        const validIds = new Set(flow.steps.map((s) => s.id));
        for (const id of input.orderedIds) {
            if (!validIds.has(id)) {
                throw new ValidationError("Reorder includes unknown step id.");
            }
        }
        if (input.orderedIds.length !== flow.steps.length) {
            throw new ValidationError(
                "Reorder must include exactly the existing steps."
            );
        }
        return this.repo.reorderSteps(input.id, input.orderedIds);
    }
}
