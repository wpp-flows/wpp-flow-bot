export interface TableBill {
    id: string;
    organizationId: string;
    tableId: string;
    total: string;
    paymentMethod: string;
    notes: string | null;
    closedAt: Date;
    closedById: string;
    createdAt: Date;
}

export interface BillRepository {
    listByOrg(organizationId: string): Promise<TableBill[]>;
    listByTable(tableId: string): Promise<TableBill[]>;
    findById(id: string): Promise<TableBill | null>;
    create(data: {
        organizationId: string;
        tableId: string;
        total: number | string;
        paymentMethod: string;
        notes?: string | null;
        closedById: string;
    }): Promise<TableBill>;
}
