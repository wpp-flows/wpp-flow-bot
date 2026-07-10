import { PrismaBotRepository } from "../../repositories/prisma/prisma-bot-repo";
import {
    DeleteBotUseCase,
    GetBotUseCase,
    ListBotsUseCase,
    SetBotIsActiveUseCase,
    UpdateBotUseCase,
} from "../bot-usecases";
import { RegisterCloudBotUseCase } from "../register-cloud-bot";

const repo = new PrismaBotRepository();

export const makeListBots = () => new ListBotsUseCase(repo);
export const makeGetBot = () => new GetBotUseCase(repo);
export const makeUpdateBot = () => new UpdateBotUseCase(repo);
export const makeDeleteBot = () => new DeleteBotUseCase(repo);
export const makeRegisterCloudBot = () => new RegisterCloudBotUseCase(repo);
export const makeSetBotIsActive = () => new SetBotIsActiveUseCase(repo);

export { repo as botRepo };
