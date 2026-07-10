import { botRepo } from "@/modules/bot/usecases/factories";
import { conversationRepo, messageRepo } from "@/modules/chat/usecases/factories";
import { customerRepo } from "@/modules/customer/usecases/factories";
import { flowRepo } from "@/modules/flow/usecases/factories";
import { orderRepo } from "@/modules/order/usecases/factories";
import { organizationRepo } from "@/modules/organization/usecases/factories";
import { FlowRunner } from "../flow-runner";
import { FlowStateMachine } from "../flow/flow-state-machine";
import { FlowStepSender } from "../flow/flow-step-sender";
import { paymentTimeoutScheduler } from "../flow/scheduler/payment-timeout-scheduler";
import { defaultStepStrategies } from "../flow/strategies";
import { HandleCloudEventUseCase } from "../cloud/handle-cloud-event";
import { PostPaymentHandler } from "../post-payment/post-payment-handler";

const flowStateMachine = new FlowStateMachine();
const flowStepSender = new FlowStepSender(defaultStepStrategies());

export const flowRunner = new FlowRunner(
    flowRepo,
    conversationRepo,
    messageRepo,
    customerRepo,
    organizationRepo,
    flowStateMachine,
    flowStepSender,
);

paymentTimeoutScheduler.start();

const postPaymentHandler = new PostPaymentHandler(
    organizationRepo,
    orderRepo,
    customerRepo,
    conversationRepo,
    messageRepo,
);

export const makeHandleCloudEvent = () =>
    new HandleCloudEventUseCase(
        botRepo,
        conversationRepo,
        messageRepo,
        flowRunner,
        postPaymentHandler,
    );
