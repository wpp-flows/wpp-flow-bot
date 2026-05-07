import { ConflictError } from "@/shared/exceptions/http";
import type { Organization, OrganizationRepository } from "../repositories/organization-repo";

export interface CreateOrganizationInput {
    ownerId: string;
    name: string;
    slug?: string;
}

export class CreateOrganizationUseCase {
    constructor(private readonly repo: OrganizationRepository) {}

    async execute(input: CreateOrganizationInput): Promise<Organization> {
        const existing = await this.repo.findByOwnerId(input.ownerId);
        if (existing) {
            throw new ConflictError("User already has an organization.");
        }

        const slug = (input.slug ?? slugify(input.name)).toLowerCase();
        const conflict = await this.repo.findBySlug(slug);
        if (conflict) {
            throw new ConflictError("Slug already taken.");
        }

        return this.repo.create({ name: input.name, slug, ownerId: input.ownerId });
    }
}

function slugify(name: string): string {
    return name
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}
