import { botRepo } from "@/modules/bot/usecases/factories";
import { conversationRepo, messageRepo } from "@/modules/chat/usecases/factories";
import { customerRepo } from "@/modules/customer/usecases/factories";
import { PrismaOrderRepository } from "../../repositories/prisma/prisma-order-repo";
import {
    CreateOrderFromCartUseCase,
    GetOrderUseCase,
    ListOrdersUseCase,
    MarkOrderPaidUseCase,
    UpdateOrderStatusUseCase,
} from "../order-usecases";
import { NotifyCustomerOrderStatusChangeUseCase } from "../notify-customer-status-change";

const repo = new PrismaOrderRepository();

const notifyCustomerStatusChange = new NotifyCustomerOrderStatusChangeUseCase(
    conversationRepo,
    botRepo,
    messageRepo,
);

export const makeListOrders = () => new ListOrdersUseCase(repo);
export const makeGetOrder = () => new GetOrderUseCase(repo);
export const makeUpdateOrderStatus = () =>
    new UpdateOrderStatusUseCase(repo, notifyCustomerStatusChange);
export const makeCreateOrderFromCart = () =>
    new CreateOrderFromCartUseCase(repo, customerRepo);
export const makeMarkOrderPaid = () => new MarkOrderPaidUseCase(repo);

export { repo as orderRepo };
