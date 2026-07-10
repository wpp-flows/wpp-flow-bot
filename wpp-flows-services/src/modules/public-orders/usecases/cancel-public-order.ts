import type { CustomerRepository } from "@/modules/customer/repositories/customer-repo";
import type { OrganizationRepository } from "@/modules/organization/repositories/organization-repo";
import { renderOrderTemplate } from "@/modules/organization/order-template";
import type { OrderRepository } from "@/modules/order/repositories/order-repo";
import { paymentTimeoutScheduler } from "@/modules/webhook/usecases/flow/scheduler/payment-timeout-scheduler";
import { NotFoundError, ValidationError } from "@/shared/exceptions/http";
import type { OrderCustomerNotifier } from "./order-customer-notifier";
import { orderNumberOf } from "./shared";
import { orderTemplate, WA_TEMPLATES } from "./whatsapp-templates";

const DEFAULT_CANCEL_MESSAGE =
    "Que pena, quem sabe na próxima! Seu pedido foi cancelado.";

export class CancelPublicOrderUseCase {
    constructor(
        private readonly orgRepo: OrganizationRepository,
        private readonly orderRepo: OrderRepository,
        private readonly customerRepo: CustomerRepository,
        private readonly notifier: OrderCustomerNotifier,
    ) {}

    async execute(input: { slug: string; orderId: string }): Promise<void> {
        const org = await this.orgRepo.findBySlug(input.slug);
        if (!org) throw new NotFoundError("Restaurant");

        const order = await this.orderRepo.findByIdInOrg(org.id, input.orderId);
        if (!order) throw new NotFoundError("Order");

        if (order.paymentStatus === "PAID") {
            throw new ValidationError("Pedido já pago — não pode ser cancelado por aqui.");
        }
        if (order.status === "CANCELED") return;

        await paymentTimeoutScheduler.clear(order.id);
        await this.orderRepo.updateStatus(order.id, "CANCELED");
        await this.orderRepo.updatePayment(order.id, { paymentStatus: "FAILED" });

        const customer = await this.customerRepo.findByIdInOrg(
            org.id,
            order.customerId,
        );
        if (!customer) return;

        const template = org.paymentCancelMessage?.trim() || DEFAULT_CANCEL_MESSAGE;
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
            template: orderTemplate(
                WA_TEMPLATES.orderCanceled,
                orderNumberOf(order.sequence),
            ),
        });
    }
}
