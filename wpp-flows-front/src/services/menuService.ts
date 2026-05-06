import { STORAGE_KEYS } from '@/constants/app';
import { apiCall, ApiError } from '@/instances/api';
import { storage } from '@/instances/storage';
import { generateId } from '@/lib/utils';
import type {
  CreateCategoryPayload,
  CreateItemPayload,
  MenuCategory,
  MenuItem,
  UpdateCategoryPayload,
  UpdateItemPayload,
} from '@/types';
import { mockCategories, mockItems } from './_mockData';

interface MenuState {
  categories: MenuCategory[];
  items: MenuItem[];
}

const seed = (): MenuState => {
  const stored = storage.get<MenuState | null>(STORAGE_KEYS.menu, null);
  if (stored && stored.categories?.length) return stored;
  const fresh: MenuState = { categories: mockCategories, items: mockItems };
  storage.set(STORAGE_KEYS.menu, fresh);
  return fresh;
};

const persist = (state: MenuState) => storage.set(STORAGE_KEYS.menu, state);

export const menuService = {
  async listCategories(): Promise<MenuCategory[]> {
    return apiCall({ endpoint: '/menu/categories' }, () =>
      seed().categories.slice().sort((a, b) => a.position - b.position),
    );
  },

  async listItems(): Promise<MenuItem[]> {
    return apiCall({ endpoint: '/menu/items' }, () =>
      seed().items.slice().sort((a, b) => a.position - b.position),
    );
  },

  async createCategory(payload: CreateCategoryPayload): Promise<MenuCategory> {
    return apiCall({ endpoint: '/menu/categories', method: 'POST', body: payload }, () => {
      const state = seed();
      const now = new Date().toISOString();
      const category: MenuCategory = {
        id: generateId('cat'),
        name: payload.name,
        description: payload.description,
        position: state.categories.length,
        createdAt: now,
        updatedAt: now,
      };
      const next = { ...state, categories: [...state.categories, category] };
      persist(next);
      return category;
    });
  },

  async updateCategory(payload: UpdateCategoryPayload): Promise<MenuCategory> {
    return apiCall(
      { endpoint: `/menu/categories/${payload.id}`, method: 'PATCH', body: payload },
      () => {
        const state = seed();
        const idx = state.categories.findIndex((c) => c.id === payload.id);
        if (idx < 0) throw new ApiError('Category not found', 404, `/menu/categories/${payload.id}`);
        const next: MenuCategory = {
          ...state.categories[idx],
          ...payload,
          updatedAt: new Date().toISOString(),
        };
        const categories = [...state.categories];
        categories[idx] = next;
        persist({ ...state, categories });
        return next;
      },
    );
  },

  async removeCategory(id: string): Promise<void> {
    return apiCall({ endpoint: `/menu/categories/${id}`, method: 'DELETE' }, () => {
      const state = seed();
      const categories = state.categories.filter((c) => c.id !== id);
      const items = state.items.filter((i) => i.categoryId !== id);
      persist({ categories, items });
    });
  },

  async reorderCategories(orderedIds: string[]): Promise<MenuCategory[]> {
    return apiCall(
      { endpoint: '/menu/categories/reorder', method: 'PATCH', body: orderedIds, delay: 250 },
      () => {
        const state = seed();
        const updated = state.categories.map((c) => ({
          ...c,
          position: orderedIds.indexOf(c.id) === -1 ? c.position : orderedIds.indexOf(c.id),
          updatedAt: new Date().toISOString(),
        }));
        persist({ ...state, categories: updated });
        return updated.slice().sort((a, b) => a.position - b.position);
      },
    );
  },

  async createItem(payload: CreateItemPayload): Promise<MenuItem> {
    return apiCall({ endpoint: '/menu/items', method: 'POST', body: payload }, () => {
      const state = seed();
      const positionInCat = state.items.filter((i) => i.categoryId === payload.categoryId).length;
      const now = new Date().toISOString();
      const item: MenuItem = {
        id: generateId('itm'),
        categoryId: payload.categoryId,
        name: payload.name,
        description: payload.description,
        price: payload.price,
        imageUrl: payload.imageUrl,
        available: payload.available ?? true,
        position: positionInCat,
        createdAt: now,
        updatedAt: now,
      };
      const next = { ...state, items: [...state.items, item] };
      persist(next);
      return item;
    });
  },

  async updateItem(payload: UpdateItemPayload): Promise<MenuItem> {
    return apiCall(
      { endpoint: `/menu/items/${payload.id}`, method: 'PATCH', body: payload },
      () => {
        const state = seed();
        const idx = state.items.findIndex((i) => i.id === payload.id);
        if (idx < 0) throw new ApiError('Item not found', 404, `/menu/items/${payload.id}`);
        const next: MenuItem = {
          ...state.items[idx],
          ...payload,
          updatedAt: new Date().toISOString(),
        };
        const items = [...state.items];
        items[idx] = next;
        persist({ ...state, items });
        return next;
      },
    );
  },

  async removeItem(id: string): Promise<void> {
    return apiCall({ endpoint: `/menu/items/${id}`, method: 'DELETE' }, () => {
      const state = seed();
      persist({ ...state, items: state.items.filter((i) => i.id !== id) });
    });
  },
};
