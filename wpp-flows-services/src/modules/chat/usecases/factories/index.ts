import { botRepo } from "@/modules/bot/usecases/factories";
import { PrismaConversationRepository } from "../../repositories/prisma/prisma-conversation-repo";
import { PrismaMessageRepository } from "../../repositories/prisma/prisma-message-repo";
import {
    GetConversationUseCase,
    ListConversationsUseCase,
    ListMessagesUseCase,
    MarkConversationReadUseCase,
    SendMessageUseCase,
    SetBotActiveUseCase,
    UpdateConversationStatusUseCase,
} from "../chat-usecases";

const conversationRepo = new PrismaConversationRepository();
const messageRepo = new PrismaMessageRepository();

export const makeListConversations = () =>
    new ListConversationsUseCase(conversationRepo);
export const makeGetConversation = () =>
    new GetConversationUseCase(conversationRepo);
export const makeListMessages = () =>
    new ListMessagesUseCase(conversationRepo, messageRepo);
export const makeSendMessage = () =>
    new SendMessageUseCase(conversationRepo, messageRepo, botRepo);
export const makeSetBotActive = () => new SetBotActiveUseCase(conversationRepo);
export const makeUpdateConversationStatus = () =>
    new UpdateConversationStatusUseCase(conversationRepo);
export const makeMarkConversationRead = () =>
    new MarkConversationReadUseCase(conversationRepo);

export { conversationRepo, messageRepo };
