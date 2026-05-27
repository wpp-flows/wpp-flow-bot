export type PromotionKind = "NTH_ORDER_DISCOUNT" | "DAILY_MESSAGE" | "BUNDLE";
export type PromotionDiscountType = "PERCENT" | "FIXED";

export interface BundleComponent {
    id: string;
    label: string;
    itemIds: string[];
    count: number;
    free: boolean;
}

export interface BundleQuestion {
    id: string;
    label: string;
    fieldKey: string;
}

export interface BundleConfig {
    components: BundleComponent[];
    price: string;
    questions: BundleQuestion[];
}

export interface Promotion {
    id: string;
    organizationId: string;
    kind: PromotionKind;
    name: string;
    isActive: boolean;
    /** NTH_ORDER_DISCOUNT only: discount fires when customer.orderCount + 1 === nthOrder. */
    nthOrder: number | null;
    discountType: PromotionDiscountType | null;
    discountValue: string | null;
    /** DAILY_MESSAGE only: 0–6 (Sunday..Saturday). Empty array means every day. */
    daysOfWeek: number[];
    message: string | null;
    /** DAILY_MESSAGE only: menu item highlighted as the "item do dia". */
    featuredItemId: string | null;
    /** DAILY_MESSAGE only: discounted price for the featured item (BRL). */
    promotionalPrice: string | null;
    teaserOrderOffset: number | null;
    teaserMessage: string | null;
    qualifyingMessage: string | null;
    bundle: BundleConfig | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface PromotionInput {
    kind: PromotionKind;
    name: string;
    isActive?: boolean;
    nthOrder?: number | null;
    discountType?: PromotionDiscountType | null;
    discountValue?: number | string | null;
    daysOfWeek?: number[];
    message?: string | null;
    featuredItemId?: string | null;
    promotionalPrice?: number | string | null;
    teaserOrderOffset?: number | null;
    teaserMessage?: string | null;
    qualifyingMessage?: string | null;
    bundle?: BundleConfig | null;
}

export interface PromotionRepository {
    listByOrg(organizationId: string): Promise<Promotion[]>;
    listActive(organizationId: string): Promise<Promotion[]>;
    findByIdInOrg(organizationId: string, id: string): Promise<Promotion | null>;
    create(
        organizationId: string,
        data: PromotionInput,
    ): Promise<Promotion>;
    update(id: string, data: Partial<PromotionInput>): Promise<Promotion>;
    delete(id: string): Promise<void>;
}
