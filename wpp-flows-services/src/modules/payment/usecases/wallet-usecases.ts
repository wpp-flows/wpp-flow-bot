import type {
    Wallet,
    WalletRepository,
    WalletServiceType,
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
    async execute(
        organizationId: string,
        filters: { serviceType?: WalletServiceType } = {},
    ): Promise<WalletTransaction[]> {
        const wallet = await this.repo.getOrCreate(organizationId);
        return this.repo.listTransactions(wallet.id, {
            serviceType: filters.serviceType,
        });
    }
}
