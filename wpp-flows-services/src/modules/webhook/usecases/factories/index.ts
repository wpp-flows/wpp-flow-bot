import { botRepo } from "@/modules/bot/usecases/factories";
import { conversationRepo, messageRepo } from "@/modules/chat/usecases/factories";
import { customerRepo } from "@/modules/customer/usecases/factories";
import { flowRepo } from "@/modules/flow/usecases/factories";
import { categoryRepo, itemRepo } from "@/modules/menu/usecases/factories";
import { orderRepo } from "@/modules/order/usecases/factories";
import { CreateOrderFromCartUseCase } from "@/modules/order/usecases/order-usecases";
import { notificationEmitter } from "@/modules/notification/usecases/factories";
import { createPaymentLink } from "@/modules/payment/usecases/factories";
import { promotionRepo } from "@/modules/promotion/usecases/factories";
import { FlowRunner } from "../flow-runner";
import { FlowStateMachine } from "../flow/flow-state-machine";
import { FlowStepSender } from "../flow/flow-step-sender";
import { defaultStepStrategies } from "../flow/strategies";
import { HandleEvolutionEventUseCase } from "../handle-evolution-event";
import { defaultWebhookStrategies } from "../strategies";

const createOrderFromCart = new CreateOrderFromCartUseCase(orderRepo, customerRepo);

const flowStateMachine = new FlowStateMachine(itemRepo);
const flowStepSender = new FlowStepSender(
    defaultStepStrategies({
        categoryRepo,
        itemRepo,
        orderRepo,
        promotionRepo,
        createPaymentLink,
    }),
);

export const flowRunner = new FlowRunner(
    flowRepo,
    conversationRepo,
    messageRepo,
    customerRepo,
    orderRepo,
    createOrderFromCart,
    promotionRepo,
    notificationEmitter,
    flowStateMachine,
    flowStepSender,
);

const webhookStrategies = defaultWebhookStrategies();

export const makeHandleEvolutionEvent = () =>
    new HandleEvolutionEventUseCase(
        botRepo,
        conversationRepo,
        messageRepo,
        customerRepo,
        flowRunner,
        notificationEmitter,
        webhookStrategies,
    );
