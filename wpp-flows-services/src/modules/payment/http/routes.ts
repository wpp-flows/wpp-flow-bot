import { MercadoPagoWebhookController } from "./controllers/mercadopago-webhook-controller";
import { WalletController } from "./controllers/wallet-controller";

export const paymentRoutes = [
    new WalletController(),
    new MercadoPagoWebhookController(),
];
