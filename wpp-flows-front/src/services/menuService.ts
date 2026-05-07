import { apiCall } from '@/instances/api';
import type {
  CreateCategoryPayload,
  CreateItemPayload,
  MenuCategory,
  MenuItem,
  UpdateCategoryPayload,
  UpdateItemPayload,
} from '@/types';

export const menuService = {
  listCategories(): Promise<MenuCategory[]> {
    return apiCall<MenuCategory[]>({ endpoint: '/api/menu/categories' });
  },

  listItems(): Promise<MenuItem[]> {
    return apiCall<MenuItem[]>({ endpoint: '/api/menu/items' });
  },

  createCategory(payload: CreateCategoryPayload): Promise<MenuCategory> {
    return apiCall<MenuCategory>({
      endpoint: '/api/menu/categories',
      method: 'POST',
      body: payload,
    });
  },

  updateCategory(payload: UpdateCategoryPayload): Promise<MenuCategory> {
    const { id, ...rest } = payload;
    return apiCall<MenuCategory>({
      endpoint: `/api/menu/categories/${id}`,
      method: 'PATCH',
      body: rest,
    });
  },

  removeCategory(id: string): Promise<void> {
    return apiCall<void>({
      endpoint: `/api/menu/categories/${id}`,
      method: 'DELETE',
    });
  },

  reorderCategories(orderedIds: string[]): Promise<MenuCategory[]> {
    return apiCall<MenuCategory[]>({
      endpoint: '/api/menu/categories/reorder',
      method: 'PATCH',
      body: { orderedIds },
    });
  },

  createItem(payload: CreateItemPayload): Promise<MenuItem> {
    return apiCall<MenuItem>({
      endpoint: '/api/menu/items',
      method: 'POST',
      body: payload,
    });
  },

  updateItem(payload: UpdateItemPayload): Promise<MenuItem> {
    const { id, ...rest } = payload;
    return apiCall<MenuItem>({
      endpoint: `/api/menu/items/${id}`,
      method: 'PATCH',
      body: rest,
    });
  },

  removeItem(id: string): Promise<void> {
    return apiCall<void>({
      endpoint: `/api/menu/items/${id}`,
      method: 'DELETE',
    });
  },

  reorderItems(categoryId: string, orderedIds: string[]): Promise<MenuItem[]> {
    return apiCall<MenuItem[]>({
      endpoint: '/api/menu/items/reorder',
      method: 'PATCH',
      body: { categoryId, orderedIds },
    });
  },
};
