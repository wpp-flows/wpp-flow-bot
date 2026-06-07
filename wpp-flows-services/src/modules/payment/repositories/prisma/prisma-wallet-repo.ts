import { prisma } from "@/infrastructure/database/client";
import { NotFoundError, ValidationError } from "@/shared/exceptions/http";
import type {
    ListTransactionsFilters,
    Wallet,
    WalletRepository,
    WalletServiceType,
    WalletTransaction,
    WalletTxKind,
    WalletTxStatus,
} from "../wallet-repo";

const toWallet = (row: any): Wallet => ({
    id: row.id,
    organizationId: row.organizationId,
    balance: String(row.balance),
    localBalance: row.localBalance != null ? String(row.localBalance) : "0",
    currency: row.currency,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
});

const toTx = (row: any): WalletTransaction => ({
    id: row.id,
    walletId: row.walletId,
    kind: row.kind as WalletTxKind,
    amount: String(row.amount),
    status: row.status as WalletTxStatus,
    orderId: row.orderId ?? null,
    billId: row.billId ?? null,
    note: row.note ?? null,
    serviceType: (row.serviceType ?? "DELIVERY") as WalletServiceType,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
});

export class PrismaWalletRepository implements WalletRepository {
    async findByOrg(organizationId: string): Promise<Wallet | null> {
        const row = await prisma.wallet.findUnique({ where: { organizationId } });
        return row ? toWallet(row) : null;
    }

    async getOrCreate(organizationId: string): Promise<Wallet> {
        const row = await prisma.wallet.upsert({
            where: { organizationId },
            update: {},
            create: { organizationId },
        });
        return toWallet(row);
    }

    async listTransactions(
        walletId: string,
        filters: ListTransactionsFilters = {},
    ): Promise<WalletTransaction[]> {
        const rows = await prisma.walletTransaction.findMany({
            where: {
                walletId,
                ...(filters.serviceType ? { serviceType: filters.serviceType } : {}),
            },
            orderBy: { createdAt: "desc" },
        });
        return rows.map(toTx);
    }

    async appendTransaction(input: {
        walletId: string;
        kind: WalletTxKind;
        amount: number | string;
        status?: WalletTxStatus;
        orderId?: string | null;
        billId?: string | null;
        note?: string | null;
        serviceType?: WalletServiceType;
    }): Promise<WalletTransaction> {
        const status = input.status ?? "COMPLETED";
        const serviceType = input.serviceType ?? "DELIVERY";
        const numericAmount =
            typeof input.amount === "number"
                ? input.amount
                : Number.parseFloat(input.amount);
        if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
            throw new ValidationError("Wallet amount must be a positive number.");
        }

        const balanceField = serviceType === "LOCAL" ? "localBalance" : "balance";

        const tx = await prisma.$transaction(async (db) => {
            if (input.kind === "WITHDRAWAL" && status === "PENDING") {
                const wallet = await db.wallet.findUnique({
                    where: { id: input.walletId },
                });
                if (!wallet) throw new NotFoundError("Wallet");
                const current =
                    serviceType === "LOCAL"
                        ? Number.parseFloat(String(wallet.localBalance ?? "0"))
                        : Number.parseFloat(String(wallet.balance));
                if (current < numericAmount) {
                    throw new ValidationError("Saldo insuficiente para saque.");
                }
                await db.wallet.update({
                    where: { id: input.walletId },
                    data: { [balanceField]: { decrement: numericAmount } } as any,
                });
            } else if (input.kind === "CREDIT" && status === "COMPLETED") {
                await db.wallet.update({
                    where: { id: input.walletId },
                    data: { [balanceField]: { increment: numericAmount } } as any,
                });
            }

            return db.walletTransaction.create({
                data: {
                    walletId: input.walletId,
                    kind: input.kind,
                    amount: numericAmount,
                    status,
                    orderId: input.orderId ?? null,
                    billId: input.billId ?? null,
                    note: input.note ?? null,
                    serviceType,
                },
            });
        });
        return toTx(tx);
    }

    async updateTransactionStatus(
        id: string,
        nextStatus: WalletTxStatus,
    ): Promise<WalletTransaction> {
        const updated = await prisma.$transaction(async (db) => {
            const existing = await db.walletTransaction.findUnique({
                where: { id },
            });
            if (!existing) throw new NotFoundError("WalletTransaction");
            if (existing.status === nextStatus) return existing;
            const serviceType =
                ((existing as any).serviceType ?? "DELIVERY") as WalletServiceType;
            const balanceField = serviceType === "LOCAL" ? "localBalance" : "balance";

            if (existing.kind === "WITHDRAWAL" && existing.status === "PENDING") {
                if (nextStatus === "REJECTED") {
                    await db.wallet.update({
                        where: { id: existing.walletId },
                        data: {
                            [balanceField]: { increment: Number(existing.amount) },
                        } as any,
                    });
                } else if (nextStatus !== "COMPLETED") {
                    throw new ValidationError(
                        `Withdrawal can move from PENDING only to COMPLETED or REJECTED.`,
                    );
                }
            } else {
                throw new ValidationError(
                    "Only pending withdrawals can change status.",
                );
            }

            return db.walletTransaction.update({
                where: { id },
                data: { status: nextStatus },
            });
        });
        return toTx(updated);
    }
}
