import { PrismaCategoryRepository } from "@/modules/menu/repositories/prisma/prisma-category-repo";
import { PrismaFlowRepository } from "../../repositories/prisma/prisma-flow-repo";
import {
    ActivateFlowUseCase,
    CreateFlowUseCase,
    CreateNewFlowVersionUseCase,
    DeleteFlowUseCase,
    GetActiveFlowUseCase,
    GetFlowUseCase,
    ListFlowsUseCase,
    ReorderFlowStepsUseCase,
    ReplaceFlowStepsUseCase,
    UpdateFlowUseCase,
} from "../flow-usecases";

const repo = new PrismaFlowRepository();
const categoryRepo = new PrismaCategoryRepository();

export const makeListFlows = () => new ListFlowsUseCase(repo);
export const makeGetActiveFlow = () => new GetActiveFlowUseCase(repo);
export const makeGetFlow = () => new GetFlowUseCase(repo);
export const makeCreateFlow = () => new CreateFlowUseCase(repo);
export const makeUpdateFlow = () => new UpdateFlowUseCase(repo);
export const makeDeleteFlow = () => new DeleteFlowUseCase(repo);
export const makeCreateNewFlowVersion = () => new CreateNewFlowVersionUseCase(repo);
export const makeActivateFlow = () => new ActivateFlowUseCase(repo);
export const makeReplaceFlowSteps = () => new ReplaceFlowStepsUseCase(repo, categoryRepo);
export const makeReorderFlowSteps = () => new ReorderFlowStepsUseCase(repo);

export { repo as flowRepo };
