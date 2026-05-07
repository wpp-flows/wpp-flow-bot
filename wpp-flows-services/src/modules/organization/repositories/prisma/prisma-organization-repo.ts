import { prisma } from "@/infrastructure/database/client";
import type { Organization, OrganizationRepository } from "../organization-repo";

export class PrismaOrganizationRepository implements OrganizationRepository {
    async findByOwnerId(ownerId: string): Promise<Organization | null> {
        return prisma.organization.findUnique({ where: { ownerId } });
    }

    async findBySlug(slug: string): Promise<Organization | null> {
        return prisma.organization.findUnique({ where: { slug } });
    }

    async create(data: { name: string; slug: string; ownerId: string }): Promise<Organization> {
        return prisma.organization.create({ data });
    }

    async update(id: string, data: { name?: string; slug?: string }): Promise<Organization> {
        return prisma.organization.update({ where: { id }, data });
    }
}
