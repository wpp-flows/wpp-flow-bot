import type { ListSection } from "./flow-list-types";
import type {
    BundleProgress,
    FlowCartItem,
    FlowState,
} from "@/modules/chat/repositories/chat-repo";
import type {
    MenuCategory,
    MenuItem,
} from "@/modules/menu/repositories/menu-repo";
import type { Promotion } from "@/modules/promotion/repositories/promotion-repo";
import { BUNDLE_PREFIX, CATEGORY_PREFIX, ITEM_PREFIX } from "./flow-shared";

export const initialState = (): FlowState => ({
    phase: "CATEGORY",
    selectedCategoryId: null,
    cart: [],
});

export function appendToCart(
    cart: FlowCartItem[],
    item: MenuItem,
): FlowCartItem[] {
    const existing = cart.find((c) => c.itemId === item.id);
    if (existing) {
        return cart.map((c) =>
            c.itemId === item.id ? { ...c, qty: c.qty + 1 } : c,
        );
    }
    return [
        ...cart,
        {
            itemId: item.id,
            name: item.name,
            price: String(item.price),
            qty: 1,
        },
    ];
}

export function appendBundleToCart(
    cart: FlowCartItem[],
    bundle: Promotion,
    progress: BundleProgress,
): FlowCartItem[] {
    const price = bundle.bundle?.price ?? "0";
    return [
        ...cart,
        {
            itemId: `${BUNDLE_PREFIX}${bundle.id}:${Date.now()}`,
            name: bundle.name,
            price,
            qty: 1,
            bundle: {
                bundleId: bundle.id,
                picks: progress.picks,
                answers: progress.answers,
            },
        },
    ];
}

export function buildCategorySections(
    categories: MenuCategory[],
): ListSection[] {
    if (categories.length === 0) return [];
    return [
        {
            title: "Categorias",
            rows: categories.map((cat) => ({
                rowId: `${CATEGORY_PREFIX}${cat.id}`,
                title: cat.name,
                description: cat.description ?? undefined,
            })),
        },
    ];
}

export function buildItemSections(items: MenuItem[]): ListSection[] {
    if (items.length === 0) return [];
    return [
        {
            title: "Itens",
            rows: items.map((item) => ({
                rowId: `${ITEM_PREFIX}${item.id}`,
                title: item.name,
                description: `R$ ${item.price}${
                    item.description ? ` — ${item.description}` : ""
                }`,
            })),
        },
    ];
}
