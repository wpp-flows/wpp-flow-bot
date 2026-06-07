export type TableStatus = "EMPTY" | "OCCUPIED" | "BILL_REQUESTED";

export interface RestaurantTable {
    id: string;
    organizationId: string;
    label: string;
    qrToken: string;
    position: number;
    seats: number | null;
    notes: string | null;
    status: TableStatus;
    billRequestedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface TableRepository {
    listByOrg(organizationId: string): Promise<RestaurantTable[]>;
    findByIdInOrg(
        organizationId: string,
        id: string,
    ): Promise<RestaurantTable | null>;
    findByToken(token: string): Promise<RestaurantTable | null>;
    create(data: {
        organizationId: string;
        label: string;
        qrToken: string;
        position?: number;
        seats?: number | null;
        notes?: string | null;
    }): Promise<RestaurantTable>;
    update(
        id: string,
        data: Partial<{
            label: string;
            position: number;
            seats: number | null;
            notes: string | null;
            status: TableStatus;
            billRequestedAt: Date | null;
            qrToken: string;
        }>,
    ): Promise<RestaurantTable>;
    delete(id: string): Promise<void>;
}
