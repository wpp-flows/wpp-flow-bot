import { botRepo } from "@/modules/bot/usecases/factories";
import { conversationRepo, messageRepo } from "@/modules/chat/usecases/factories";
import { couponRepo } from "@/modules/coupon/usecases/factories";
import { customerRepo } from "@/modules/customer/usecases/factories";
import { itemRepo } from "@/modules/menu/usecases/factories";
import { notificationEmitter } from "@/modules/notification/usecases/factories";
import { organizationRepo } from "@/modules/organization/usecases/factories";
import { orderRepo } from "@/modules/order/usecases/factories";
import { CreateOrderFromCartUseCase } from "@/modules/order/usecases/order-usecases";
import { createPaymentLink } from "@/modules/payment/usecases/factories";
import { promotionRepo } from "@/modules/promotion/usecases/factories";
import { tableRepo } from "@/modules/local-service/usecases/factories";
import { paymentTimeoutScheduler } from "@/modules/webhook/usecases/flow/scheduler/payment-timeout-scheduler";
import { CancelPublicOrderUseCase } from "../cancel-public-order";
import { CreateDeliveryOrderUseCase } from "../create-delivery-order";
import { CreateLocalOrderUseCase } from "../create-local-order";
import { GetCustomerContextUseCase } from "../get-customer-context";
import { NotifyOrderReceivedUseCase } from "../notify-order-received";
import { NotifyPaymentConfirmedUseCase } from "../notify-payment-confirmed";
import { OrderCustomerNotifier } from "../order-customer-notifier";
import { PaymentTimeoutHandler } from "../payment-timeout-handler";
import { ValidatePublicCouponUseCase } from "../validate-public-coupon";

const customerNotifier = new OrderCustomerNotifier(
    botRepo,
    conversationRepo,
    messageRepo,
);

const createOrderFromCart = new CreateOrderFromCartUseCase(orderRepo, customerRepo);

const notifyOrderReceived = new NotifyOrderReceivedUseCase(
    organizationRepo,
    customerRepo,
    customerNotifier,
);

export const createDeliveryOrder = new CreateDeliveryOrderUseCase(
    organizationRepo,
    botRepo,
    itemRepo,
    promotionRepo,
    couponRepo,
    customerRepo,
    orderRepo,
    conversationRepo,
    createOrderFromCart,
    createPaymentLink,
    notificationEmitter,
    notifyOrderReceived,
);

export const createLocalOrder = new CreateLocalOrderUseCase(
    organizationRepo,
    itemRepo,
    promotionRepo,
    couponRepo,
    customerRepo,
    orderRepo,
    tableRepo,
    createOrderFromCart,
    notificationEmitter,
);

export const cancelPublicOrder = new CancelPublicOrderUseCase(
    organizationRepo,
    orderRepo,
    customerRepo,
    customerNotifier,
);

export const validatePublicCoupon = new ValidatePublicCouponUseCase(
    organizationRepo,
    couponRepo,
    orderRepo,
);

export const getCustomerContext = new GetCustomerContextUseCase(
    organizationRepo,
    customerRepo,
    promotionRepo,
);

export const notifyPaymentConfirmed = new NotifyPaymentConfirmedUseCase(
    organizationRepo,
    customerRepo,
    customerNotifier,
);

const paymentTimeoutHandler = new PaymentTimeoutHandler(
    organizationRepo,
    orderRepo,
    customerRepo,
    customerNotifier,
);

paymentTimeoutScheduler.setHandler(paymentTimeoutHandler.handle);
