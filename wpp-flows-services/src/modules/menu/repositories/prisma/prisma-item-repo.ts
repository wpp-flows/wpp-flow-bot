import { prisma } from "@/infrastructure/database/client";
import type { ServiceType } from "@/modules/order/repositories/order-repo";
import type {
    ItemRepository,
    MenuItem,
    MenuItemOption,
    MenuItemOptionGroup,
    NullablePriceInput,
    PriceInput,
} from "../menu-repo";

function toOptionGroups(raw: unknown): MenuItemOptionGroup[] {
    if (!Array.isArray(raw)) return [];
    return raw
        .filter((g): g is Record<string, unknown> => !!g && typeof g === "object")
        .map((g, gIdx) => {
            const minRaw = Number((g as { minSelections?: unknown }).minSelections ?? 0);
            const maxRaw = Number((g as { maxSelections?: unknown }).maxSelections ?? 1);
            const options = toOptions((g as { options?: unknown }).options);
            return {
                id: String((g as { id?: unknown }).id ?? ""),
                title: String((g as { title?: unknown }).title ?? ""),
                subtitle:
                    (g as { subtitle?: unknown }).subtitle === null ||
                    (g as { subtitle?: unknown }).subtitle === undefined
                        ? null
                        : String((g as { subtitle?: unknown }).subtitle ?? ""),
                minSelections: Number.isFinite(minRaw) ? Math.max(0, minRaw) : 0,
                maxSelections: Number.isFinite(maxRaw)
                    ? Math.max(0, maxRaw)
                    : Math.max(1, options.length),
                position: Number((g as { position?: unknown }).position ?? gIdx),
                options,
            };
        })
        .filter((g) => g.id && g.title);
}

function toOptions(raw: unknown): MenuItemOption[] {
    if (!Array.isArray(raw)) return [];
    return raw
        .filter((o): o is Record<string, unknown> => !!o && typeof o === "object")
        .map((o, oIdx) => ({
            id: String((o as { id?: unknown }).id ?? ""),
            name: String((o as { name?: unknown }).name ?? ""),
            additionalPrice: String(
                (o as { additionalPrice?: unknown }).additionalPrice ??
                    (o as { price?: unknown }).price ??
                    "0",
            ),
            imageUrl:
                (o as { imageUrl?: unknown }).imageUrl === undefined ||
                (o as { imageUrl?: unknown }).imageUrl === null
                    ? null
                    : String((o as { imageUrl?: unknown }).imageUrl),
            position: Number((o as { position?: unknown }).position ?? oIdx),
        }))
        .filter((o) => o.id && o.name);
}

function priceToColumn(value: NullablePriceInput | undefined): string | null {
    if (value === undefined || value === null || value === "") return null;
    return typeof value === "number" ? value.toString() : value;
}

const toModel = (row: any): MenuItem => ({
    id: row.id,
    organizationId: row.organizationId,
    categoryId: row.categoryId,
    serviceType: row.serviceType as ServiceType,
    name: row.name,
    description: row.description,
    price: row.price.toString(),
    originalPrice: row.originalPrice == null ? null : row.originalPrice.toString(),
    promotionalPrice:
        row.promotionalPrice == null ? null : row.promotionalPrice.toString(),
    imageUrl: row.imageUrl,
    available: row.available,
    availableDaysOfWeek: (row.availableDaysOfWeek as number[] | null) ?? [],
    position: row.position,
    optionGroups: toOptionGroups(row.optionGroups),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
});

export class PrismaItemRepository implements ItemRepository {
    async listByOrg(
        organizationId: string,
        filters: { serviceType?: ServiceType } = {},
    ): Promise<MenuItem[]> {
        const rows = await prisma.menuItem.findMany({
            where: {
                organizationId,
                ...(filters.serviceType ? { serviceType: filters.serviceType } : {}),
            },
            orderBy: [{ categoryId: "asc" }, { position: "asc" }],
        });
        return rows.map(toModel);
    }

    async listByCategory(categoryId: string): Promise<MenuItem[]> {
        const rows = await prisma.menuItem.findMany({
            where: { categoryId },
            orderBy: { position: "asc" },
        });
        return rows.map(toModel);
    }

    async findByIdInOrg(
        organizationId: string,
        id: string
    ): Promise<MenuItem | null> {
        const row = await prisma.menuItem.findFirst({
            where: { id, organizationId },
        });
        return row ? toModel(row) : null;
    }

    async create(data: {
        organizationId: string;
        categoryId: string;
        serviceType: ServiceType;
        name: string;
        description: string;
        price: PriceInput;
        originalPrice?: NullablePriceInput;
        promotionalPrice?: NullablePriceInput;
        imageUrl?: string;
        available?: boolean;
        availableDaysOfWeek?: number[];
        position: number;
        optionGroups?: MenuItemOptionGroup[];
    }): Promise<MenuItem> {
        const { optionGroups, originalPrice, promotionalPrice, ...rest } = data;
        const row = await prisma.menuItem.create({
            data: {
                ...rest,
                price: rest.price.toString(),
                originalPrice: priceToColumn(originalPrice),
                promotionalPrice: priceToColumn(promotionalPrice),
                optionGroups: (optionGroups ?? []) as any,
            },
        });
        return toModel(row);
    }

    async update(
        id: string,
        data: {
            categoryId?: string;
            serviceType?: ServiceType;
            name?: string;
            description?: string;
            price?: PriceInput;
            originalPrice?: NullablePriceInput;
            promotionalPrice?: NullablePriceInput;
            imageUrl?: string | null;
            available?: boolean;
            availableDaysOfWeek?: number[];
            position?: number;
            optionGroups?: MenuItemOptionGroup[];
        }
    ): Promise<MenuItem> {
        const { optionGroups, originalPrice, promotionalPrice, ...rest } = data;
        const row = await prisma.menuItem.update({
            where: { id },
            data: {
                ...rest,
                price: rest.price === undefined ? undefined : rest.price.toString(),
                ...(originalPrice !== undefined
                    ? { originalPrice: priceToColumn(originalPrice) }
                    : {}),
                ...(promotionalPrice !== undefined
                    ? { promotionalPrice: priceToColumn(promotionalPrice) }
                    : {}),
                ...(optionGroups !== undefined
                    ? { optionGroups: optionGroups as any }
                    : {}),
            },
        });
        return toModel(row);
    }

    async delete(id: string): Promise<void> {
        await prisma.menuItem.delete({ where: { id } });
    }

    async countByCategory(categoryId: string): Promise<number> {
        return prisma.menuItem.count({ where: { categoryId } });
    }

    async setPositions(orderedIds: string[]): Promise<void> {
        await prisma.$transaction(
            orderedIds.map((id, position) =>
                prisma.menuItem.update({ where: { id }, data: { position } })
            )
        );
    }
}
