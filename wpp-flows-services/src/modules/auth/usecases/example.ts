import { ExampleNotFoundError } from "@/shared/exceptions/example";
import { ExampleRepository } from "../repositories/example-repo";

interface ExampleRequest {
    id: string;
}

interface ExampleResponse {
    id: string
}

export class ExampleUseCase {
    constructor(
        private readonly examplerepository: ExampleRepository
    ) { }

    async execute(request: ExampleRequest): Promise<ExampleResponse> {
        const example = await this.examplerepository.findAll();

        if (!example) {
            throw new ExampleNotFoundError();
        }

        return { id: example.toString() };
    }
}