import { notificationEmitter } from "@/modules/notification/usecases/factories";
import { makeCreateAdminNotification } from "@/modules/admin/usecases/factories";
import { PrismaBotRepository } from "../../repositories/prisma/prisma-bot-repo";
import {
    ConnectBotUseCase,
    CreateBotUseCase,
    DeleteBotUseCase,
    DisconnectBotUseCase,
    GetBotConnectionStateUseCase,
    GetBotUseCase,
    ListBotsUseCase,
    SetBotIsActiveUseCase,
    UpdateBotUseCase,
} from "../bot-usecases";
import { BotMonitor } from "../bot-monitor";
import { WhatsAppVersionMonitor } from "../whatsapp-version-monitor";

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
export const makeSetBotIsActive = () => new SetBotIsActiveUseCase(repo);

export const botMonitor = new BotMonitor(repo, notificationEmitter);
export const whatsappVersionMonitor = new WhatsAppVersionMonitor(
    makeCreateAdminNotification(),
);

export { repo as botRepo };
