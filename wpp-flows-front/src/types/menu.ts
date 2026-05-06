export interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  available: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface MenuCategory {
  id: string;
  name: string;
  description?: string;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryPayload {
  name: string;
  description?: string;
}

export interface UpdateCategoryPayload {
  id: string;
  name?: string;
  description?: string;
  position?: number;
}

export interface CreateItemPayload {
  categoryId: string;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  available?: boolean;
}

export interface UpdateItemPayload extends Partial<CreateItemPayload> {
  id: string;
  position?: number;
}
