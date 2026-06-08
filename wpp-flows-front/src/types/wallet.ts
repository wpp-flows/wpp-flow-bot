export type WalletTxKind = 'CREDIT' | 'WITHDRAWAL';
export type WalletTxStatus = 'PENDING' | 'COMPLETED' | 'REJECTED';
export type WalletServiceType = 'DELIVERY' | 'LOCAL';

export interface Wallet {
  id: string;
  organizationId: string;
  balance: string;
  localBalance: string;
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
  billId: string | null;
  note: string | null;
  serviceType: WalletServiceType;
  createdAt: string;
  updatedAt: string;
}
