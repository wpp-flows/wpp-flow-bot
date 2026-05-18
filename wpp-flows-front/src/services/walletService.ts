import { apiCall } from '@/instances/api';
import type { Wallet, WalletTransaction } from '@/types';

export const walletService = {
  get(): Promise<Wallet> {
    return apiCall<Wallet>({ endpoint: '/api/wallet' });
  },
  listTransactions(): Promise<WalletTransaction[]> {
    return apiCall<WalletTransaction[]>({ endpoint: '/api/wallet/transactions' });
  },
  requestWithdrawal(payload: { amount: number; note?: string }): Promise<WalletTransaction> {
    return apiCall<WalletTransaction>({
      endpoint: '/api/wallet/withdrawals',
      method: 'POST',
      body: payload,
    });
  },
  cancelWithdrawal(id: string): Promise<WalletTransaction> {
    return apiCall<WalletTransaction>({
      endpoint: `/api/wallet/withdrawals/${id}/cancel`,
      method: 'POST',
    });
  },
};
