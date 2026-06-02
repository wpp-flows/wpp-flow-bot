import type { BundleConfig } from './promotion';

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

export interface PublicMenuAdditional {
  id: string;
  name: string;
  price: string;
}

export interface PublicMenuItem {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  price: string;
  imageUrl: string | null;
  position: number;
  additionals: PublicMenuAdditional[];
}

export interface PublicMenuPromotion {
  id: string;
  kind: 'NTH_ORDER_DISCOUNT' | 'DAILY_MESSAGE' | 'BUNDLE';
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
  bundle: BundleConfig | null;
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

export interface PublicCartBundlePick {
  componentId: string;
  itemId: string;
  itemName: string;
}

export interface PublicCartAdditional {
  id: string;
  name: string;
  price: string;
}

export interface PublicCartItem {
  id: string;
  itemId: string;
  name: string;
  price: string;
  qty: number;
  notes?: string | null;
  additionals: PublicCartAdditional[];
  bundle?: {
    bundleId: string;
    picks: PublicCartBundlePick[];
    answers: Record<string, string>;
  } | null;
}

export type PublicPaymentMethod = 'MERCADOPAGO' | 'CASH';

export interface CreatePublicOrderPayload {
  customer: { name: string; phone: string };
  items: Array<{
    itemId: string;
    qty: number;
    notes?: string | null;
    additionals?: { id: string; name: string; price: number }[];
    bundle?: {
      bundleId: string;
      picks: { componentId: string; itemId: string }[];
      answers?: Record<string, string>;
    } | null;
  }>;
  observation?: string | null;
  address?: string | null;
  deliveryMode: PublicDeliveryMode;
  couponCode?: string | null;
  paymentMethod?: PublicPaymentMethod;
  cashChangeFor?: number | null;
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
  total: string;
  paymentLink: string | null;
  bot: { phoneNumber: string | null } | null;
}
