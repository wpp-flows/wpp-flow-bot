export interface MenuCategory {
    id: string;
    organizationId: string;
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
    listByOrg(organizationId: string): Promise<MenuCategory[]>;
    findByIdInOrg(organizationId: string, id: string): Promise<MenuCategory | null>;
    create(data: {
        organizationId: string;
        name: string;
        description?: string;
        position: number;
    }): Promise<MenuCategory>;
    update(
        id: string,
        data: { name?: string; description?: string }
    ): Promise<MenuCategory>;
    delete(id: string): Promise<void>;
    countByOrg(organizationId: string): Promise<number>;
    setPositions(orderedIds: string[]): Promise<void>;
}

export interface ItemRepository {
    listByOrg(organizationId: string): Promise<MenuItem[]>;
    listByCategory(categoryId: string): Promise<MenuItem[]>;
    findByIdInOrg(organizationId: string, id: string): Promise<MenuItem | null>;
    create(data: {
        organizationId: string;
        categoryId: string;
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
