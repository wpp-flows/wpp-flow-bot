export interface PublicMenuOrganization {
  id: string;
  name: string;
  slug: string;
  /** Flat delivery fee in BRL (decimal string). 0 = free delivery. */
  deliveryFee: string;
}

export type PublicDeliveryMode = 'PICKUP' | 'DELIVERY';

export interface PublicMenuCategory {
  id: string;
  name: string;
  description: string | null;
  position: number;
}

export interface PublicMenuOption {
  id: string;
  name: string;
  additionalPrice: string;
  imageUrl: string | null;
  position: number;
}

export interface PublicMenuOptionGroup {
  id: string;
  title: string;
  subtitle: string | null;
  minSelections: number;
  maxSelections: number;
  position: number;
  options: PublicMenuOption[];
}

export interface PublicMenuItem {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  price: string;
  promotionalPrice: string | null;
  imageUrl: string | null;
  position: number;
  optionGroups: PublicMenuOptionGroup[];
}

export interface PublicMenuPromotion {
  id: string;
  kind: 'NTH_ORDER_DISCOUNT' | 'DAILY_MESSAGE';
  name: string;
  message: string | null;
  featuredItemId: string | null;
  promotionalPrice: string | null;
  nthOrder: number | null;
  discountType: 'PERCENT' | 'FIXED' | null;
  discountValue: string | null;
  teaserOrderOffset: number | null;
  teaserMessage: string | null;
  qualifyingMessage: string | null;
}

export type CustomerContextBannerKind = 'QUALIFYING' | 'TEASER';

export interface CustomerContextBanner {
  promotionId: string;
  kind: CustomerContextBannerKind;
  message: string;
  nthOrder: number;
  discountType: 'PERCENT' | 'FIXED';
  discountValue: string;
}

export interface CustomerContextResponse {
  orderCount: number;
  nextOrderNumber: number;
  banners: CustomerContextBanner[];
}

export interface PublicMenuBot {
  id: string;
  phoneNumber: string | null;
  status: 'CONNECTING' | 'ONLINE' | 'OFFLINE' | 'ERROR';
}

export interface PublicMenuResponse {
  organization: PublicMenuOrganization;
  categories: PublicMenuCategory[];
  items: PublicMenuItem[];
  promotions: PublicMenuPromotion[];
  bot: PublicMenuBot | null;
  isOpen: boolean;
  closedMessage: string | null;
}

export interface PublicCartSelectedOption {
  groupId: string;
  optionId: string;
  name: string;
  additionalPrice: string;
}

export interface PublicCartItem {
  id: string;
  itemId: string;
  name: string;
  price: string;
  qty: number;
  notes?: string | null;
  selectedOptions: PublicCartSelectedOption[];
}

export type PublicPaymentMethod = 'MERCADOPAGO' | 'CASH' | 'DELIVERY_CARD_PIX';

export interface CreatePublicOrderPayload {
  customer?: { name: string; phone: string };
  items: Array<{
    itemId: string;
    qty: number;
    notes?: string | null;
    selections?: { groupId: string; optionIds: string[] }[];
  }>;
  observation?: string | null;
  address?: string | null;
  deliveryMode?: PublicDeliveryMode;
  couponCode?: string | null;
  paymentMethod?: PublicPaymentMethod;
  cashChangeFor?: number | null;
  tableToken?: string;
  customerName?: string;
}

export interface ValidatedCoupon {
  code: string;
  discountType: 'PERCENT' | 'FIXED';
  discountValue: string;
  discount: number;
}

export interface CreatePublicOrderResponse {
  orderId: string;
  orderNumber: string;
  paymentLink: string;
  total: string;
}

export interface PublicOrderStatusResponse {
  id: string;
  sequence: number;
  status: 'RECEIVED' | 'PREPARING' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELED';
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  paymentProvider: string | null;
  total: string;
  paymentLink: string | null;
  bot: { phoneNumber: string | null } | null;
}
