import { NotFoundError, ValidationError } from "@/shared/exceptions/http";
import type { CategoryRepository, MenuCategory } from "../repositories/menu-repo";

export class ListCategoriesUseCase {
    constructor(private readonly repo: CategoryRepository) {}
    execute(organizationId: string): Promise<MenuCategory[]> {
        return this.repo.listByOrg(organizationId);
    }
}

export class CreateCategoryUseCase {
    constructor(private readonly repo: CategoryRepository) {}
    async execute(input: {
        organizationId: string;
        name: string;
        description?: string;
    }): Promise<MenuCategory> {
        const position = await this.repo.countByOrg(input.organizationId);
        return this.repo.create({ ...input, position });
    }
}

export class UpdateCategoryUseCase {
    constructor(private readonly repo: CategoryRepository) {}
    async execute(input: {
        organizationId: string;
        id: string;
        name?: string;
        description?: string;
    }): Promise<MenuCategory> {
        const existing = await this.repo.findByIdInOrg(input.organizationId, input.id);
        if (!existing) throw new NotFoundError("Category");
        return this.repo.update(input.id, {
            name: input.name,
            description: input.description,
        });
    }
}

export class DeleteCategoryUseCase {
    constructor(private readonly repo: CategoryRepository) {}
    async execute(input: { organizationId: string; id: string }): Promise<void> {
        const existing = await this.repo.findByIdInOrg(input.organizationId, input.id);
        if (!existing) throw new NotFoundError("Category");
        await this.repo.delete(input.id);
    }
}

export class ReorderCategoriesUseCase {
    constructor(private readonly repo: CategoryRepository) {}
    async execute(input: {
        organizationId: string;
        orderedIds: string[];
    }): Promise<MenuCategory[]> {
        const all = await this.repo.listByOrg(input.organizationId);
        const orgIds = new Set(all.map((c) => c.id));
        for (const id of input.orderedIds) {
            if (!orgIds.has(id)) {
                throw new ValidationError("Reorder includes unknown category id.");
            }
        }
        if (input.orderedIds.length !== all.length) {
            throw new ValidationError(
                "Reorder must contain exactly the existing categories."
            );
        }
        await this.repo.setPositions(input.orderedIds);
        return this.repo.listByOrg(input.organizationId);
    }
}
