import type { ServiceType } from './order';

export interface MenuCategory {
  id: string;
  organizationId: string;
  serviceType: ServiceType;
  name: string;
  description?: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface MenuItemOption {
  id: string;
  name: string;
  additionalPrice: string;
  imageUrl?: string | null;
  position: number;
}

export interface MenuItemOptionGroup {
  id: string;
  title: string;
  subtitle?: string | null;
  minSelections: number;
  maxSelections: number;
  position: number;
  options: MenuItemOption[];
}

export interface MenuItem {
  id: string;
  organizationId: string;
  categoryId: string;
  serviceType: ServiceType;
  name: string;
  description: string;
  price: string;
  /** Optional "antes" price for strikethrough display. */
  originalPrice: string | null;
  /** Optional active promo. When set, this is what the customer pays. */
  promotionalPrice: string | null;
  imageUrl?: string | null;
  available: boolean;
  /** 0–6 (Sunday..Saturday). Empty = available every day. */
  availableDaysOfWeek: number[];
  position: number;
  optionGroups: MenuItemOptionGroup[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryPayload {
  serviceType: ServiceType;
  name: string;
  description?: string;
}

export interface UpdateCategoryPayload {
  id: string;
  name?: string;
  description?: string;
}

export interface OptionPayload {
  id: string;
  name: string;
  additionalPrice: number;
  imageUrl?: string;
}

export interface OptionGroupPayload {
  id: string;
  title: string;
  subtitle?: string | null;
  minSelections: number;
  maxSelections: number;
  options: OptionPayload[];
}

export interface CreateItemPayload {
  categoryId: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number | null;
  promotionalPrice?: number | null;
  imageUrl?: string;
  available?: boolean;
  availableDaysOfWeek?: number[];
  optionGroups?: OptionGroupPayload[];
}

export interface UpdateItemPayload {
  id: string;
  categoryId?: string;
  name?: string;
  description?: string;
  price?: number;
  originalPrice?: number | null;
  promotionalPrice?: number | null;
  imageUrl?: string | null;
  available?: boolean;
  availableDaysOfWeek?: number[];
  optionGroups?: OptionGroupPayload[];
}
