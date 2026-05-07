import { NotFoundError, ValidationError } from "@/shared/exceptions/http";
import type {
    CategoryRepository,
    ItemRepository,
    MenuItem,
} from "../repositories/menu-repo";

export class ListItemsUseCase {
    constructor(private readonly repo: ItemRepository) {}
    execute(organizationId: string): Promise<MenuItem[]> {
        return this.repo.listByOrg(organizationId);
    }
}

export class CreateItemUseCase {
    constructor(
        private readonly itemRepo: ItemRepository,
        private readonly categoryRepo: CategoryRepository
    ) {}

    async execute(input: {
        organizationId: string;
        categoryId: string;
        name: string;
        description: string;
        price: number;
        imageUrl?: string;
        available?: boolean;
    }): Promise<MenuItem> {
        const category = await this.categoryRepo.findByIdInOrg(
            input.organizationId,
            input.categoryId
        );
        if (!category) throw new NotFoundError("Category");

        const position = await this.itemRepo.countByCategory(input.categoryId);
        return this.itemRepo.create({ ...input, position });
    }
}

export class UpdateItemUseCase {
    constructor(
        private readonly itemRepo: ItemRepository,
        private readonly categoryRepo: CategoryRepository
    ) {}

    async execute(input: {
        organizationId: string;
        id: string;
        categoryId?: string;
        name?: string;
        description?: string;
        price?: number;
        imageUrl?: string | null;
        available?: boolean;
    }): Promise<MenuItem> {
        const existing = await this.itemRepo.findByIdInOrg(
            input.organizationId,
            input.id
        );
        if (!existing) throw new NotFoundError("Item");

        if (input.categoryId && input.categoryId !== existing.categoryId) {
            const category = await this.categoryRepo.findByIdInOrg(
                input.organizationId,
                input.categoryId
            );
            if (!category) throw new NotFoundError("Category");
        }

        return this.itemRepo.update(input.id, {
            categoryId: input.categoryId,
            name: input.name,
            description: input.description,
            price: input.price,
            imageUrl: input.imageUrl,
            available: input.available,
        });
    }
}

export class DeleteItemUseCase {
    constructor(private readonly repo: ItemRepository) {}
    async execute(input: { organizationId: string; id: string }): Promise<void> {
        const existing = await this.repo.findByIdInOrg(input.organizationId, input.id);
        if (!existing) throw new NotFoundError("Item");
        await this.repo.delete(input.id);
    }
}

export class ReorderItemsUseCase {
    constructor(
        private readonly itemRepo: ItemRepository,
        private readonly categoryRepo: CategoryRepository
    ) {}

    async execute(input: {
        organizationId: string;
        categoryId: string;
        orderedIds: string[];
    }): Promise<MenuItem[]> {
        const category = await this.categoryRepo.findByIdInOrg(
            input.organizationId,
            input.categoryId
        );
        if (!category) throw new NotFoundError("Category");

        const items = await this.itemRepo.listByCategory(input.categoryId);
        const validIds = new Set(items.map((i) => i.id));
        for (const id of input.orderedIds) {
            if (!validIds.has(id)) {
                throw new ValidationError("Reorder includes unknown item id.");
            }
        }
        if (input.orderedIds.length !== items.length) {
            throw new ValidationError(
                "Reorder must contain exactly the items in this category."
            );
        }
        await this.itemRepo.setPositions(input.orderedIds);
        return this.itemRepo.listByCategory(input.categoryId);
    }
}
