export interface MenuCategory {
  id: string;
  organizationId: string;
  name: string;
  description?: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface MenuItemAdditional {
  id: string;
  name: string;
  price: string;
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
  availableForDelivery: boolean;
  availableForLocal: boolean;
  position: number;
  additionals: MenuItemAdditional[];
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

export interface AdditionalPayload {
  id: string;
  name: string;
  price: number;
}

export interface CreateItemPayload {
  categoryId: string;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  available?: boolean;
  availableDaysOfWeek?: number[];
  availableForDelivery?: boolean;
  availableForLocal?: boolean;
  additionals?: AdditionalPayload[];
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
  availableForDelivery?: boolean;
  availableForLocal?: boolean;
  additionals?: AdditionalPayload[];
}
