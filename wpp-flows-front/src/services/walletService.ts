import { apiCall } from '@/instances/api';
import type { Wallet, WalletServiceType, WalletTransaction } from '@/types';

export const walletService = {
  get(): Promise<Wallet> {
    return apiCall<Wallet>({ endpoint: '/api/wallet' });
  },
  listTransactions(filters: { serviceType?: WalletServiceType } = {}): Promise<
    WalletTransaction[]
  > {
    const params = new URLSearchParams();
    if (filters.serviceType) params.set('serviceType', filters.serviceType);
    const qs = params.toString();
    return apiCall<WalletTransaction[]>({
      endpoint: qs ? `/api/wallet/transactions?${qs}` : '/api/wallet/transactions',
    });
  },
};
