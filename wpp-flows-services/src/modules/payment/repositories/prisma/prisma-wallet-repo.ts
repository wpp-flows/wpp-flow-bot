import { prisma } from "@/infrastructure/database/client";
import { NotFoundError, ValidationError } from "@/shared/exceptions/http";
import type {
    Wallet,
    WalletRepository,
    WalletTransaction,
    WalletTxKind,
    WalletTxStatus,
} from "../wallet-repo";

const toWallet = (row: any): Wallet => ({
    id: row.id,
    organizationId: row.organizationId,
    balance: String(row.balance),
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
    note: row.note ?? null,
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

    async listTransactions(walletId: string): Promise<WalletTransaction[]> {
        const rows = await prisma.walletTransaction.findMany({
            where: { walletId },
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
        note?: string | null;
    }): Promise<WalletTransaction> {
        const status = input.status ?? "COMPLETED";
        const numericAmount =
            typeof input.amount === "number"
                ? input.amount
                : Number.parseFloat(input.amount);
        if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
            throw new ValidationError("Wallet amount must be a positive number.");
        }

        // CREDIT (COMPLETED) → add to balance.
        // WITHDRAWAL (PENDING) → hold the funds immediately (subtract).
        // Other combinations create the record without touching the balance.
        const tx = await prisma.$transaction(async (db) => {
            if (input.kind === "WITHDRAWAL" && status === "PENDING") {
                const wallet = await db.wallet.findUnique({
                    where: { id: input.walletId },
                });
                if (!wallet) throw new NotFoundError("Wallet");
                if (Number.parseFloat(String(wallet.balance)) < numericAmount) {
                    throw new ValidationError("Saldo insuficiente para saque.");
                }
                await db.wallet.update({
                    where: { id: input.walletId },
                    data: { balance: { decrement: numericAmount } },
                });
            } else if (input.kind === "CREDIT" && status === "COMPLETED") {
                await db.wallet.update({
                    where: { id: input.walletId },
                    data: { balance: { increment: numericAmount } },
                });
            }

            return db.walletTransaction.create({
                data: {
                    walletId: input.walletId,
                    kind: input.kind,
                    amount: numericAmount,
                    status,
                    orderId: input.orderId ?? null,
                    note: input.note ?? null,
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

            // Only handle the legal transitions we care about:
            // - PENDING WITHDRAWAL → COMPLETED: balance already debited at PENDING time. No-op.
            // - PENDING WITHDRAWAL → REJECTED: release the held funds back to balance.
            if (existing.kind === "WITHDRAWAL" && existing.status === "PENDING") {
                if (nextStatus === "REJECTED") {
                    await db.wallet.update({
                        where: { id: existing.walletId },
                        data: {
                            balance: { increment: Number(existing.amount) },
                        },
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
