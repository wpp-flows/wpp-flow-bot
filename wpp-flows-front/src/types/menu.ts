export interface MenuCategory {
  id: string;
  organizationId: string;
  name: string;
  description?: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface MenuItem {
  id: string;
  organizationId: string;
  categoryId: string;
  name: string;
  description: string;
  price: string;
  imageUrl?: string | null;
  available: boolean;
  /** 0–6 (Sunday..Saturday). Empty = available every day. */
  availableDaysOfWeek: number[];
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
}

export interface CreateItemPayload {
  categoryId: string;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  available?: boolean;
  availableDaysOfWeek?: number[];
}

export interface UpdateItemPayload {
  id: string;
  categoryId?: string;
  name?: string;
  description?: string;
  price?: number;
  imageUrl?: string | null;
  available?: boolean;
  availableDaysOfWeek?: number[];
}
