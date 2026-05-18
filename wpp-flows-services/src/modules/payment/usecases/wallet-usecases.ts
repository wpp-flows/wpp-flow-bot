import {
    MercadoPagoClient,
    MercadoPagoError,
} from "@/infrastructure/mercadopago/client";
import type { OrganizationRepository } from "@/modules/organization/repositories/organization-repo";
import { NotFoundError, ValidationError } from "@/shared/exceptions/http";
import type {
    Wallet,
    WalletRepository,
    WalletTransaction,
} from "../repositories/wallet-repo";

export class GetWalletUseCase {
    constructor(private readonly repo: WalletRepository) {}
    execute(organizationId: string): Promise<Wallet> {
        return this.repo.getOrCreate(organizationId);
    }
}

export class ListWalletTransactionsUseCase {
    constructor(private readonly repo: WalletRepository) {}
    async execute(organizationId: string): Promise<WalletTransaction[]> {
        const wallet = await this.repo.getOrCreate(organizationId);
        return this.repo.listTransactions(wallet.id);
    }
}

export class RequestWithdrawalUseCase {
    constructor(
        private readonly repo: WalletRepository,
        private readonly processWithdrawal: ProcessWithdrawalUseCase,
    ) {}
    async execute(input: {
        organizationId: string;
        amount: number;
        note?: string;
    }): Promise<WalletTransaction> {
        if (!Number.isFinite(input.amount) || input.amount <= 0) {
            throw new ValidationError("Informe um valor positivo de saque.");
        }
        const wallet = await this.repo.getOrCreate(input.organizationId);
        if (Number.parseFloat(wallet.balance) < input.amount) {
            throw new ValidationError("Saldo insuficiente.");
        }
        const pending = await this.repo.appendTransaction({
            walletId: wallet.id,
            kind: "WITHDRAWAL",
            amount: input.amount,
            status: "PENDING",
            note: input.note ?? null,
        });
        // Fire the auto-payout. If MP succeeds, the tx flips to COMPLETED; on
        // failure it flips to REJECTED and the balance is refunded. Either way
        // we return the latest tx state to the caller.
        try {
            return await this.processWithdrawal.execute({
                organizationId: input.organizationId,
                transactionId: pending.id,
            });
        } catch (err) {
            console.error("Auto-payout failed; withdrawal stays PENDING:", err);
            return pending;
        }
    }
}

/**
 * Calls Mercado Pago to actually move the money to the organization's PIX key
 * and resolves the wallet transaction. Idempotent on already-resolved txs.
 */
export class ProcessWithdrawalUseCase {
    constructor(
        private readonly repo: WalletRepository,
        private readonly orgRepo: OrganizationRepository,
    ) {}

    async execute(input: {
        organizationId: string;
        transactionId: string;
    }): Promise<WalletTransaction> {
        const wallet = await this.repo.findByOrg(input.organizationId);
        if (!wallet) throw new NotFoundError("Wallet");
        const list = await this.repo.listTransactions(wallet.id);
        const tx = list.find((t) => t.id === input.transactionId);
        if (!tx) throw new NotFoundError("WalletTransaction");
        if (tx.kind !== "WITHDRAWAL") {
            throw new ValidationError(
                "Apenas transações de saque podem ser processadas.",
            );
        }
        if (tx.status !== "PENDING") return tx;

        const org = await this.orgRepo.findById(input.organizationId);
        if (!org?.mercadoPagoAccessToken) {
            // No MP credentials — leave PENDING for manual approval.
            return tx;
        }
        if (!org.payoutPixKey || !org.payoutPixKeyType) {
            // Missing PIX destination — can't auto-pay. Leave PENDING.
            return tx;
        }

        try {
            const client = new MercadoPagoClient(org.mercadoPagoAccessToken);
            const resp = await client.createPixWithdrawal({
                amount: Number.parseFloat(tx.amount),
                pixKey: org.payoutPixKey,
                pixKeyType: org.payoutPixKeyType,
                description: tx.note ?? `Saque ${tx.id}`,
                externalReference: tx.id,
            });
            // MP returns approved | pending | rejected — anything other than rejected
            // we treat as completed (pending on MP side is still funds-leaving).
            if (resp.status === "rejected") {
                return this.repo.updateTransactionStatus(tx.id, "REJECTED");
            }
            return this.repo.updateTransactionStatus(tx.id, "COMPLETED");
        } catch (err) {
            if (err instanceof MercadoPagoError) {
                console.error(
                    `MP withdrawal rejected (${err.status}); refunding balance:`,
                    err.body,
                );
                return this.repo.updateTransactionStatus(tx.id, "REJECTED");
            }
            throw err;
        }
    }
}

export class CancelWithdrawalUseCase {
    constructor(private readonly repo: WalletRepository) {}
    async execute(input: {
        organizationId: string;
        transactionId: string;
    }): Promise<WalletTransaction> {
        const wallet = await this.repo.findByOrg(input.organizationId);
        if (!wallet) throw new NotFoundError("Wallet");
        // Soft enforcement: the repo verifies the tx belongs to this wallet on
        // status update via the wallet id stored on the row.
        const list = await this.repo.listTransactions(wallet.id);
        const tx = list.find((t) => t.id === input.transactionId);
        if (!tx) throw new NotFoundError("WalletTransaction");
        if (tx.kind !== "WITHDRAWAL" || tx.status !== "PENDING") {
            throw new ValidationError("Apenas saques pendentes podem ser cancelados.");
        }
        return this.repo.updateTransactionStatus(tx.id, "REJECTED");
    }
}
