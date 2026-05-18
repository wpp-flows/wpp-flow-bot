import type {
    CategoryRepository,
    ItemRepository,
} from "@/modules/menu/repositories/menu-repo";
import type { OrderRepository } from "@/modules/order/repositories/order-repo";
import type { CreatePaymentLinkUseCase } from "@/modules/payment/usecases/mercadopago-usecases";
import type { PromotionRepository } from "@/modules/promotion/repositories/promotion-repo";
import { ConfirmationStepStrategy } from "./confirmation-step-strategy";
import { MenuStepStrategy } from "./menu-step-strategy";
import { PaymentStepStrategy } from "./payment-step-strategy";
import { PlainStepStrategy } from "./plain-step-strategy";
import type { FlowStepStrategy } from "./step-strategy";

export type {
    FlowStepSenderContext,
    FlowStepStrategy,
} from "./step-strategy";
export { ConfirmationStepStrategy } from "./confirmation-step-strategy";
export { MenuStepStrategy } from "./menu-step-strategy";
export { PaymentStepStrategy } from "./payment-step-strategy";
export { PlainStepStrategy } from "./plain-step-strategy";

/**
 * Builds the default step-strategy lineup. Order matters: the sender picks the
 * first strategy whose `supports()` is true, so the specific renderers come
 * before {@link PlainStepStrategy} (which acts as the universal fallback).
 */
export function defaultStepStrategies(deps: {
    categoryRepo: CategoryRepository;
    itemRepo: ItemRepository;
    orderRepo: OrderRepository;
    promotionRepo: PromotionRepository;
    createPaymentLink: CreatePaymentLinkUseCase;
}): FlowStepStrategy[] {
    return [
        new MenuStepStrategy(deps.categoryRepo, deps.itemRepo, deps.promotionRepo),
        new ConfirmationStepStrategy(),
        new PaymentStepStrategy(deps.orderRepo, deps.createPaymentLink),
        new PlainStepStrategy(),
    ];
}
