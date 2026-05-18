export type WalletTxKind = "CREDIT" | "WITHDRAWAL";
export type WalletTxStatus = "PENDING" | "COMPLETED" | "REJECTED";

export interface Wallet {
    id: string;
    organizationId: string;
    balance: string;
    currency: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface WalletTransaction {
    id: string;
    walletId: string;
    kind: WalletTxKind;
    amount: string;
    status: WalletTxStatus;
    orderId: string | null;
    note: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface WalletRepository {
    findByOrg(organizationId: string): Promise<Wallet | null>;
    /** Returns the existing wallet or creates an empty one for the org. */
    getOrCreate(organizationId: string): Promise<Wallet>;
    listTransactions(walletId: string): Promise<WalletTransaction[]>;
    /**
     * Atomically appends a transaction and updates the wallet balance.
     * - CREDIT (COMPLETED) → balance += amount
     * - WITHDRAWAL (PENDING) → balance -= amount immediately (held)
     * - WITHDRAWAL (REJECTED) → must already be PENDING; balance += amount back
     * - WITHDRAWAL (COMPLETED) from PENDING → no balance change (already debited)
     */
    appendTransaction(input: {
        walletId: string;
        kind: WalletTxKind;
        amount: number | string;
        status?: WalletTxStatus;
        orderId?: string | null;
        note?: string | null;
    }): Promise<WalletTransaction>;
    updateTransactionStatus(
        id: string,
        nextStatus: WalletTxStatus,
    ): Promise<WalletTransaction>;
}
