export type WalletTxKind = 'CREDIT' | 'WITHDRAWAL';
export type WalletTxStatus = 'PENDING' | 'COMPLETED' | 'REJECTED';

export interface Wallet {
  id: string;
  organizationId: string;
  balance: string;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface WalletTransaction {
  id: string;
  walletId: string;
  kind: WalletTxKind;
  amount: string;
  status: WalletTxStatus;
  orderId: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}
