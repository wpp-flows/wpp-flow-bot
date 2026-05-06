import { ExampleRepository } from "../example-repo";

export class PrismaExampleRepository implements ExampleRepository {
    async findAll(): Promise<any> {
        return "oi"
    }
}