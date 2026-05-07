import { PrismaBotRepository } from "../../repositories/prisma/prisma-bot-repo";
import {
    ConnectBotUseCase,
    CreateBotUseCase,
    DeleteBotUseCase,
    DisconnectBotUseCase,
    GetBotConnectionStateUseCase,
    GetBotUseCase,
    ListBotsUseCase,
    UpdateBotUseCase,
} from "../bot-usecases";

const repo = new PrismaBotRepository();

export const makeListBots = () => new ListBotsUseCase(repo);
export const makeGetBot = () => new GetBotUseCase(repo);
export const makeCreateBot = () => new CreateBotUseCase(repo);
export const makeUpdateBot = () => new UpdateBotUseCase(repo);
export const makeDeleteBot = () => new DeleteBotUseCase(repo);
export const makeConnectBot = () => new ConnectBotUseCase(repo);
export const makeDisconnectBot = () => new DisconnectBotUseCase(repo);
export const makeGetBotConnectionState = () =>
    new GetBotConnectionStateUseCase(repo);

export { repo as botRepo };
