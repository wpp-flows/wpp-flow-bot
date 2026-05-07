export interface Organization {
    id: string;
    name: string;
    slug: string;
    ownerId: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface OrganizationRepository {
    findByOwnerId(ownerId: string): Promise<Organization | null>;
    findBySlug(slug: string): Promise<Organization | null>;
    create(data: { name: string; slug: string; ownerId: string }): Promise<Organization>;
    update(id: string, data: { name?: string; slug?: string }): Promise<Organization>;
}
