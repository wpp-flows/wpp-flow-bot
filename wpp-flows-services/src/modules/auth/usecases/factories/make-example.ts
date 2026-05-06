import { PrismaExampleRepository } from "../../repositories/prisma/prisma-example-repo";
import { ExampleUseCase } from "../example";

export function MakeExample() {
    const exampleRepository = new PrismaExampleRepository();

    const useCase = new ExampleUseCase(exampleRepository);

    return useCase;
}