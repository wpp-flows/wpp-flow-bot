import { notificationEmitter } from "@/modules/notification/usecases/factories";
import { organizationRepo } from "@/modules/organization/usecases/factories";
import { orderRepo } from "@/modules/order/usecases/factories";
import { PrismaWalletRepository } from "../../repositories/prisma/prisma-wallet-repo";
import {
    CreatePaymentLinkUseCase,
    HandleMercadoPagoWebhookUseCase,
} from "../mercadopago-usecases";
import {
    CancelWithdrawalUseCase,
    GetWalletUseCase,
    ListWalletTransactionsUseCase,
    ProcessWithdrawalUseCase,
    RequestWithdrawalUseCase,
} from "../wallet-usecases";

const walletRepo = new PrismaWalletRepository();

const createPaymentLink = new CreatePaymentLinkUseCase(orderRepo, organizationRepo);
const handleMercadoPagoWebhook = new HandleMercadoPagoWebhookUseCase(
    orderRepo,
    organizationRepo,
    walletRepo,
    notificationEmitter,
);
const processWithdrawal = new ProcessWithdrawalUseCase(walletRepo, organizationRepo);

export const makeGetWallet = () => new GetWalletUseCase(walletRepo);
export const makeListWalletTransactions = () =>
    new ListWalletTransactionsUseCase(walletRepo);
export const makeRequestWithdrawal = () =>
    new RequestWithdrawalUseCase(walletRepo, processWithdrawal);
export const makeCancelWithdrawal = () => new CancelWithdrawalUseCase(walletRepo);
export const makeProcessWithdrawal = () => processWithdrawal;

export { walletRepo, createPaymentLink, handleMercadoPagoWebhook };
