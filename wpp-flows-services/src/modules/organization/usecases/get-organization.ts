import { NotFoundError } from "@/shared/exceptions/http";
import type { Organization, OrganizationRepository } from "../repositories/organization-repo";

export class GetOrganizationUseCase {
    constructor(private readonly repo: OrganizationRepository) {}

    async execute(ownerId: string): Promise<Organization> {
        const org = await this.repo.findByOwnerId(ownerId);
        if (!org) throw new NotFoundError("Organization");
        return org;
    }
}
