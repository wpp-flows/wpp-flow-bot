export interface MenuCategory {
    id: string;
    organizationId: string;
    name: string;
    description: string | null;
    position: number;
    createdAt: Date;
    updatedAt: Date;
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
    position: number;
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
        position: number;
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
            position?: number;
        }
    ): Promise<MenuItem>;
    delete(id: string): Promise<void>;
    countByCategory(categoryId: string): Promise<number>;
    setPositions(orderedIds: string[]): Promise<void>;
}
