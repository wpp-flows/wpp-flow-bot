import type { SendTemplateInput } from "@/infrastructure/whatsapp";
import type { OrderStatus } from "@/modules/order/repositories/order-repo";

/**
 * Approved WhatsApp Cloud API template names for the order lifecycle. These
 * MUST match templates you create + get approved in the Meta WhatsApp Manager
 * (Business Account → Message templates). Each is used only as the fallback the
 * OrderCustomerNotifier sends when the 24h free-form window has closed — inside
 * the window the customer still gets the normal free-form text.
 *
 * Convention assumed for every template: a single body variable {{1}} = the
 * order number (e.g. "0042"). Adjust `orderTemplate` if your approved templates
 * use a different variable layout.
 */
export const WA_TEMPLATE_LANGUAGE = "pt_BR";

export const WA_TEMPLATES = {
    orderReceived: "order_received",
    paymentConfirmed: "payment_confirmed",
    orderCanceled: "order_canceled",
    statusPreparing: "order_preparing",
    statusOutForDelivery: "order_out_for_delivery",
    statusDelivered: "order_delivered",
} as const;

export function orderTemplate(
    name: string,
    orderNumber: string,
): SendTemplateInput {
    return {
        name,
        languageCode: WA_TEMPLATE_LANGUAGE,
        bodyParams: [orderNumber],
    };
}

/** Maps a delivery status transition to its template, when one exists. */
export function statusTemplateFor(
    status: OrderStatus,
    orderNumber: string,
): SendTemplateInput | undefined {
    switch (status) {
        case "PREPARING":
            return orderTemplate(WA_TEMPLATES.statusPreparing, orderNumber);
        case "OUT_FOR_DELIVERY":
            return orderTemplate(WA_TEMPLATES.statusOutForDelivery, orderNumber);
        case "DELIVERED":
            return orderTemplate(WA_TEMPLATES.statusDelivered, orderNumber);
        default:
            return undefined;
    }
}
