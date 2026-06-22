import { NotFoundError, ValidationError } from "@/shared/exceptions/http";
import type { ServiceType } from "@/modules/order/repositories/order-repo";
import type {
    CategoryRepository,
    ItemRepository,
    MenuItem,
    MenuItemOptionGroup,
} from "../repositories/menu-repo";

interface OptionInput {
    id: string;
    name: string;
    additionalPrice: number;
    imageUrl?: string;
}

interface OptionGroupInput {
    id: string;
    title: string;
    subtitle?: string | null;
    minSelections: number;
    maxSelections: number;
    options: OptionInput[];
}

function normalizeOptionGroups(
    groups: OptionGroupInput[] | undefined,
): MenuItemOptionGroup[] | undefined {
    if (groups === undefined) return undefined;
    return groups.map((g, gIdx) => ({
        id: g.id,
        title: g.title.trim(),
        subtitle: g.subtitle === undefined ? null : g.subtitle?.trim() || null,
        minSelections: Math.max(0, Math.floor(g.minSelections)),
        maxSelections: Math.max(
            Math.max(0, Math.floor(g.minSelections)),
            Math.floor(g.maxSelections),
        ),
        position: gIdx,
        options: g.options.map((o, oIdx) => ({
            id: o.id,
            name: o.name.trim(),
            additionalPrice: Math.max(0, o.additionalPrice).toFixed(2),
            imageUrl: o.imageUrl?.trim() || null,
            position: oIdx,
        })),
    }));
}

export class ListItemsUseCase {
    constructor(private readonly repo: ItemRepository) { }
    execute(
        organizationId: string,
        filters: { serviceType?: ServiceType } = {},
    ): Promise<MenuItem[]> {
        return this.repo.listByOrg(organizationId, filters);
    }
}

export class CreateItemUseCase {
    constructor(
        private readonly itemRepo: ItemRepository,
        private readonly categoryRepo: CategoryRepository
    ) { }

    async execute(input: {
        organizationId: string;
        categoryId: string;
        name: string;
        description: string;
        price: number;
        promotionalPrice?: number | null;
        imageUrl?: string;
        available?: boolean;
        availableDaysOfWeek?: number[];
        optionGroups?: OptionGroupInput[];
    }): Promise<MenuItem> {
        const category = await this.categoryRepo.findByIdInOrg(
            input.organizationId,
            input.categoryId
        );
        if (!category) throw new NotFoundError("Category");

        assertPromoSanity(input.price, input.promotionalPrice);

        const position = await this.itemRepo.countByCategory(input.categoryId);
        return this.itemRepo.create({
            ...input,
            serviceType: category.serviceType,
            position,
            optionGroups: normalizeOptionGroups(input.optionGroups),
        });
    }
}

function assertPromoSanity(
    price: number,
    promotionalPrice: number | null | undefined,
): void {
    if (promotionalPrice != null && promotionalPrice >= price) {
        throw new ValidationError(
            "O preço promocional precisa ser menor que o preço normal.",
        );
    }
}

export class UpdateItemUseCase {
    constructor(
        private readonly itemRepo: ItemRepository,
        private readonly categoryRepo: CategoryRepository
    ) { }

    async execute(input: {
        organizationId: string;
        id: string;
        categoryId?: string;
        name?: string;
        description?: string;
        price?: number;
        promotionalPrice?: number | null;
        imageUrl?: string | null;
        available?: boolean;
        availableDaysOfWeek?: number[];
        optionGroups?: OptionGroupInput[];
    }): Promise<MenuItem> {
        const existing = await this.itemRepo.findByIdInOrg(
            input.organizationId,
            input.id
        );
        if (!existing) throw new NotFoundError("Item");

        let serviceType: ServiceType | undefined;
        if (input.categoryId && input.categoryId !== existing.categoryId) {
            const category = await this.categoryRepo.findByIdInOrg(
                input.organizationId,
                input.categoryId
            );
            if (!category) throw new NotFoundError("Category");

            if (category.serviceType !== existing.serviceType) {
                serviceType = category.serviceType;
            }
        }

        const effectivePrice = input.price ?? Number.parseFloat(existing.price);
        const existingPromo =
            existing.promotionalPrice == null ? null : Number.parseFloat(existing.promotionalPrice);
        const nextPromo =
            input.promotionalPrice === undefined ? existingPromo : input.promotionalPrice;
        assertPromoSanity(effectivePrice, nextPromo);

        return this.itemRepo.update(input.id, {
            categoryId: input.categoryId,
            serviceType,
            name: input.name,
            description: input.description,
            price: input.price,
            promotionalPrice: input.promotionalPrice,
            imageUrl: input.imageUrl,
            available: input.available,
            availableDaysOfWeek: input.availableDaysOfWeek,
            optionGroups: normalizeOptionGroups(input.optionGroups),
        });
    }
}

export class DeleteItemUseCase {
    constructor(private readonly repo: ItemRepository) { }
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
    ) { }

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
