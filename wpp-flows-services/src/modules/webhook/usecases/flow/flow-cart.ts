import type { ListSection } from "./flow-list-types";
import type {
    FlowCartItem,
    FlowState,
} from "@/modules/chat/repositories/chat-repo";
import type {
    MenuCategory,
    MenuItem,
} from "@/modules/menu/repositories/menu-repo";
import { CATEGORY_PREFIX, ITEM_PREFIX } from "./flow-shared";

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
