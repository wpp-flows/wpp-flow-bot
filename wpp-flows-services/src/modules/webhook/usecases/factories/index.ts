import { botRepo } from "@/modules/bot/usecases/factories";
import { conversationRepo, messageRepo } from "@/modules/chat/usecases/factories";
import { flowRepo } from "@/modules/flow/usecases/factories";
import { categoryRepo, itemRepo } from "@/modules/menu/usecases/factories";
import { FlowRunner } from "../flow-runner";
import { HandleEvolutionEventUseCase } from "../handle-evolution-event";
import { defaultWebhookStrategies } from "../strategies";

const flowRunner = new FlowRunner(
    flowRepo,
    conversationRepo,
    messageRepo,
    categoryRepo,
    itemRepo,
);
const webhookStrategies = defaultWebhookStrategies();

export const makeHandleEvolutionEvent = () =>
    new HandleEvolutionEventUseCase(
        botRepo,
        conversationRepo,
        messageRepo,
        flowRunner,
        webhookStrategies,
    );
