import { PrismaOrganizationRepository } from "../../repositories/prisma/prisma-organization-repo";
import { CreateOrganizationUseCase } from "../create-organization";
import { GetOrganizationUseCase } from "../get-organization";
import { UpdateOrganizationUseCase } from "../update-organization";

const repo = new PrismaOrganizationRepository();

export function makeGetOrganization() {
    return new GetOrganizationUseCase(repo);
}

export function makeCreateOrganization() {
    return new CreateOrganizationUseCase(repo);
}

export function makeUpdateOrganization() {
    return new UpdateOrganizationUseCase(repo);
}
