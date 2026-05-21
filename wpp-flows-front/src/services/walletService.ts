import { apiCall } from '@/instances/api';
import type { Wallet, WalletTransaction } from '@/types';

export const walletService = {
  get(): Promise<Wallet> {
    return apiCall<Wallet>({ endpoint: '/api/wallet' });
  },
  listTransactions(): Promise<WalletTransaction[]> {
    return apiCall<WalletTransaction[]>({ endpoint: '/api/wallet/transactions' });
  },
};
