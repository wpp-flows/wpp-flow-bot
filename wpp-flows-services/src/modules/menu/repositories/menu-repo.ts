import type { ServiceType } from "@/modules/order/repositories/order-repo";

export interface MenuCategory {
    id: string;
    organizationId: string;
    serviceType: ServiceType;
    name: string;
    description: string | null;
    position: number;
    createdAt: Date;
    updatedAt: Date;
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
    serviceType: ServiceType;
    name: string;
    description: string;
    price: string;
    imageUrl: string | null;
    available: boolean;
    /**
     * 0–6 (Sunday..Saturday). Empty = available every day. Anything else
     * restricts the item to those weekdays in the bot's menu.
     */
    availableDaysOfWeek: number[];
    position: number;
    additionals: MenuItemAdditional[];
    createdAt: Date;
    updatedAt: Date;
}

export interface CategoryRepository {
    listByOrg(
        organizationId: string,
        filters?: { serviceType?: ServiceType },
    ): Promise<MenuCategory[]>;
    findByIdInOrg(organizationId: string, id: string): Promise<MenuCategory | null>;
    create(data: {
        organizationId: string;
        serviceType: ServiceType;
        name: string;
        description?: string;
        position: number;
    }): Promise<MenuCategory>;
    update(
        id: string,
        data: { name?: string; description?: string }
    ): Promise<MenuCategory>;
    delete(id: string): Promise<void>;
    countByOrg(
        organizationId: string,
        filters?: { serviceType?: ServiceType },
    ): Promise<number>;
    setPositions(orderedIds: string[]): Promise<void>;
}

export interface ItemRepository {
    listByOrg(
        organizationId: string,
        filters?: { serviceType?: ServiceType },
    ): Promise<MenuItem[]>;
    listByCategory(categoryId: string): Promise<MenuItem[]>;
    findByIdInOrg(organizationId: string, id: string): Promise<MenuItem | null>;
    create(data: {
        organizationId: string;
        categoryId: string;
        serviceType: ServiceType;
        name: string;
        description: string;
        price: number | string;
        imageUrl?: string;
        available?: boolean;
        availableDaysOfWeek?: number[];
        position: number;
        additionals?: MenuItemAdditional[];
    }): Promise<MenuItem>;
    update(
        id: string,
        data: {
            categoryId?: string;
            serviceType?: ServiceType;
            name?: string;
            description?: string;
            price?: number | string;
            imageUrl?: string | null;
            available?: boolean;
            availableDaysOfWeek?: number[];
            position?: number;
            additionals?: MenuItemAdditional[];
        }
    ): Promise<MenuItem>;
    delete(id: string): Promise<void>;
    countByCategory(categoryId: string): Promise<number>;
    setPositions(orderedIds: string[]): Promise<void>;
}
