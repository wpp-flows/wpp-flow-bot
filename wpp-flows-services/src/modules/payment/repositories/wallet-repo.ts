export type WalletTxKind = "CREDIT" | "WITHDRAWAL";
export type WalletTxStatus = "PENDING" | "COMPLETED" | "REJECTED";
export type WalletServiceType = "DELIVERY" | "LOCAL";

export interface Wallet {
    id: string;
    organizationId: string;
    balance: string;
    localBalance: string;
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
    billId: string | null;
    note: string | null;
    serviceType: WalletServiceType;
    createdAt: Date;
    updatedAt: Date;
}

export interface ListTransactionsFilters {
    serviceType?: WalletServiceType;
}

export interface WalletRepository {
    findByOrg(organizationId: string): Promise<Wallet | null>;
    /** Returns the existing wallet or creates an empty one for the org. */
    getOrCreate(organizationId: string): Promise<Wallet>;
    listTransactions(
        walletId: string,
        filters?: ListTransactionsFilters,
    ): Promise<WalletTransaction[]>;
    /**
     * Atomically appends a transaction and updates the wallet balance.
     * Routing on `serviceType` decides which balance column to touch:
     *  - serviceType=DELIVERY → wallet.balance
     *  - serviceType=LOCAL    → wallet.localBalance
     *
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
        billId?: string | null;
        note?: string | null;
        serviceType?: WalletServiceType;
    }): Promise<WalletTransaction>;
    updateTransactionStatus(
        id: string,
        nextStatus: WalletTxStatus,
    ): Promise<WalletTransaction>;
}
