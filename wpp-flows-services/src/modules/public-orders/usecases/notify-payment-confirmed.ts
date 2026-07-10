import type { CustomerRepository } from "@/modules/customer/repositories/customer-repo";
import type { Order } from "@/modules/order/repositories/order-repo";
import type { OrganizationRepository } from "@/modules/organization/repositories/organization-repo";
import { renderOrderTemplate } from "@/modules/organization/order-template";
import type { OrderCustomerNotifier } from "./order-customer-notifier";
import { orderNumberOf } from "./shared";
import { orderTemplate, WA_TEMPLATES } from "./whatsapp-templates";

const DEFAULT_RECEIVED_MESSAGE = [
    "✅ Pedido {{order_number}} confirmado, recebemos seu pagamento!",
    "Já estamos cuidando de tudo por aqui — assim que sair para entrega, te avisamos.",
    "Qualquer dúvida, é só responder por aqui 🙌",
].join("\n\n");

export class NotifyPaymentConfirmedUseCase {
    constructor(
        private readonly orgRepo: OrganizationRepository,
        private readonly customerRepo: CustomerRepository,
        private readonly notifier: OrderCustomerNotifier,
    ) {}

    async execute(order: Order): Promise<void> {
        const [org, customer] = await Promise.all([
            this.orgRepo.findById(order.organizationId),
            this.customerRepo.findByIdInOrg(order.organizationId, order.customerId),
        ]);
        if (!org || !customer) return;

        const template = org.paymentReceivedMessage?.trim() || DEFAULT_RECEIVED_MESSAGE;
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
                WA_TEMPLATES.paymentConfirmed,
                orderNumberOf(order.sequence),
            ),
        });
    }
}
