import type { CustomerRepository } from "@/modules/customer/repositories/customer-repo";
import type { OrganizationRepository } from "@/modules/organization/repositories/organization-repo";
import { renderOrderTemplate } from "@/modules/organization/order-template";
import type { OrderRepository } from "@/modules/order/repositories/order-repo";
import type { PaymentTimeoutPayload } from "@/modules/webhook/usecases/flow/scheduler/payment-timeout-scheduler";
import type { OrderCustomerNotifier } from "./order-customer-notifier";

const DEFAULT_TIMEOUT_MESSAGE =
    "Seu pedido demorou demais para ser pago e foi cancelado. Quando quiser, é só chamar de novo!";

export class PaymentTimeoutHandler {
    constructor(
        private readonly orgRepo: OrganizationRepository,
        private readonly orderRepo: OrderRepository,
        private readonly customerRepo: CustomerRepository,
        private readonly notifier: OrderCustomerNotifier,
    ) {}

    handle = async (payload: PaymentTimeoutPayload): Promise<void> => {
        const order = await this.orderRepo.findByIdInOrg(
            payload.organizationId,
            payload.orderId,
        );
        if (!order) return;
        if (order.paymentStatus !== "PENDING" || order.status === "CANCELED") {
            return;
        }

        await this.orderRepo.updateStatus(order.id, "CANCELED");
        await this.orderRepo.updatePayment(order.id, { paymentStatus: "FAILED" });

        const [org, customer] = await Promise.all([
            this.orgRepo.findById(payload.organizationId),
            this.customerRepo.findByIdInOrg(payload.organizationId, order.customerId),
        ]);
        if (!org || !customer) return;

        const template = org.paymentTimeoutMessage?.trim() || DEFAULT_TIMEOUT_MESSAGE;
        const text = renderOrderTemplate(template, {
            organization: org,
            order,
            customer,
        });
        await this.notifier.notify({
            organizationId: org.id,
            phone: customer.phone,
            contactName: customer.name,
            text,
        });
    };
}
