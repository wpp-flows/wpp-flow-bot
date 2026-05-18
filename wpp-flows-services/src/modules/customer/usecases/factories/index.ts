import { PrismaCustomerRepository } from "../../repositories/prisma/prisma-customer-repo";

const repo = new PrismaCustomerRepository();

export { repo as customerRepo };
