import { notificationEmitter } from "@/modules/notification/usecases/factories";
import { organizationRepo } from "@/modules/organization/usecases/factories";
import { orderRepo } from "@/modules/order/usecases/factories";
import { PrismaWalletRepository } from "../../repositories/prisma/prisma-wallet-repo";
import {
    CreatePaymentLinkUseCase,
    HandleMercadoPagoWebhookUseCase,
} from "../mercadopago-usecases";
import {
    GetWalletUseCase,
    ListWalletTransactionsUseCase,
} from "../wallet-usecases";

const walletRepo = new PrismaWalletRepository();

const createPaymentLink = new CreatePaymentLinkUseCase(orderRepo, organizationRepo);
const handleMercadoPagoWebhook = new HandleMercadoPagoWebhookUseCase(
    orderRepo,
    organizationRepo,
    walletRepo,
    notificationEmitter,
);

export const makeGetWallet = () => new GetWalletUseCase(walletRepo);
export const makeListWalletTransactions = () =>
    new ListWalletTransactionsUseCase(walletRepo);

export { walletRepo, createPaymentLink, handleMercadoPagoWebhook };
