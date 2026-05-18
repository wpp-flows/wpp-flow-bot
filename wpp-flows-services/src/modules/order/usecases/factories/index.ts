import { customerRepo } from "@/modules/customer/usecases/factories";
import { PrismaOrderRepository } from "../../repositories/prisma/prisma-order-repo";
import {
    CreateOrderFromCartUseCase,
    GetOrderUseCase,
    ListOrdersUseCase,
    UpdateOrderStatusUseCase,
} from "../order-usecases";

const repo = new PrismaOrderRepository();

export const makeListOrders = () => new ListOrdersUseCase(repo);
export const makeGetOrder = () => new GetOrderUseCase(repo);
export const makeUpdateOrderStatus = () => new UpdateOrderStatusUseCase(repo);
export const makeCreateOrderFromCart = () =>
    new CreateOrderFromCartUseCase(repo, customerRepo);

export { repo as orderRepo };
