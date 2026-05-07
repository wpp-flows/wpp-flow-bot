import { ConnectionUpdateStrategy } from "./connection-update-strategy";
import { MessagesUpdateStrategy } from "./messages-update-strategy";
import { MessagesUpsertStrategy } from "./messages-upsert-strategy";
import { QrCodeUpdatedStrategy } from "./qrcode-updated-strategy";
import type { WebhookEventStrategy } from "./webhook-strategy";

export type { WebhookContext, WebhookEventStrategy } from "./webhook-strategy";
export { normalizeEventName } from "./webhook-strategy";
export { MessagesUpsertStrategy } from "./messages-upsert-strategy";
export { MessagesUpdateStrategy } from "./messages-update-strategy";
export { ConnectionUpdateStrategy } from "./connection-update-strategy";
export { QrCodeUpdatedStrategy } from "./qrcode-updated-strategy";

export function defaultWebhookStrategies(): WebhookEventStrategy[] {
    return [
        new MessagesUpsertStrategy(),
        new MessagesUpdateStrategy(),
        new ConnectionUpdateStrategy(),
        new QrCodeUpdatedStrategy(),
    ];
}
