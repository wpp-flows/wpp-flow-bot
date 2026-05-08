import { flowRepo } from "@/modules/flow/usecases/factories";
import { PrismaCategoryRepository } from "@/modules/menu/repositories/prisma/prisma-category-repo";
import { PrismaFlowStepRepository } from "../../repositories/prisma/prisma-flow-step-repo";
import {
  CreateFlowStepUseCase,
  DeleteFlowStepUseCase,
  UpdateFlowStepUseCase,
} from "../flow-step-usecases";

const flowStepRepo = new PrismaFlowStepRepository();
const categoryRepo = new PrismaCategoryRepository();

export const makeCreateFlowStep = () =>
  new CreateFlowStepUseCase(flowStepRepo, flowRepo, categoryRepo);
export const makeUpdateFlowStep = () =>
  new UpdateFlowStepUseCase(flowStepRepo, categoryRepo);
export const makeDeleteFlowStep = () => new DeleteFlowStepUseCase(flowStepRepo);

export { flowStepRepo };
