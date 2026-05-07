import { ConflictError, NotFoundError } from "@/shared/exceptions/http";
import type { Organization, OrganizationRepository } from "../repositories/organization-repo";

export interface UpdateOrganizationInput {
    ownerId: string;
    name?: string;
    slug?: string;
}

export class UpdateOrganizationUseCase {
    constructor(private readonly repo: OrganizationRepository) {}

    async execute(input: UpdateOrganizationInput): Promise<Organization> {
        const org = await this.repo.findByOwnerId(input.ownerId);
        if (!org) throw new NotFoundError("Organization");

        if (input.slug && input.slug !== org.slug) {
            const conflict = await this.repo.findBySlug(input.slug);
            if (conflict) throw new ConflictError("Slug already taken.");
        }

        return this.repo.update(org.id, { name: input.name, slug: input.slug });
    }
}
