export interface SavedAddress {
    label?: string;
    address: string;
    addedAt: string;
}

export interface Customer {
    id: string;
    organizationId: string;
    name: string;
    phone: string;
    orderCount: number;
    savedAddresses: SavedAddress[] | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface CustomerRepository {
    listByOrg(organizationId: string): Promise<Customer[]>;
    findByIdInOrg(organizationId: string, id: string): Promise<Customer | null>;
    findByPhone(organizationId: string, phone: string): Promise<Customer | null>;
    /**
     * Returns an existing customer (matched by `(organizationId, phone)`) or
     * creates one. If found and `name` differs from the stored value, the name
     * is left untouched — we treat the user-edited name in the dashboard as
     * canonical once it exists.
     */
    upsert(data: {
        organizationId: string;
        name: string;
        phone: string;
    }): Promise<Customer>;
    update(
        id: string,
        data: Partial<{
            name: string;
            savedAddresses: SavedAddress[] | null;
        }>,
    ): Promise<Customer>;
    incrementOrderCount(id: string): Promise<Customer>;
}
