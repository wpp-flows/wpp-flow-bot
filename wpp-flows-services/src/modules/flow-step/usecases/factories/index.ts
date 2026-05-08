import { flowRepo } from "@/modules/flow/usecases/factories";
import { PrismaFlowStepRepository } from "../../repositories/prisma/prisma-flow-step-repo";
import {
    CreateFlowStepUseCase,
    DeleteFlowStepUseCase,
    UpdateFlowStepUseCase,
} from "../flow-step-usecases";

const flowStepRepo = new PrismaFlowStepRepository();

export const makeCreateFlowStep = () =>
    new CreateFlowStepUseCase(flowStepRepo, flowRepo);
export const makeUpdateFlowStep = () =>
    new UpdateFlowStepUseCase(flowStepRepo);
export const makeDeleteFlowStep = () =>
    new DeleteFlowStepUseCase(flowStepRepo);

export { flowStepRepo };
