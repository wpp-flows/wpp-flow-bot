import { PrismaCouponRepository } from "../../repositories/prisma/prisma-coupon-repo";
import {
    CreateCouponUseCase,
    DeleteCouponUseCase,
    ListCouponsUseCase,
    UpdateCouponUseCase,
} from "../coupon-usecases";

const repo = new PrismaCouponRepository();

export const makeListCoupons = () => new ListCouponsUseCase(repo);
export const makeCreateCoupon = () => new CreateCouponUseCase(repo);
export const makeUpdateCoupon = () => new UpdateCouponUseCase(repo);
export const makeDeleteCoupon = () => new DeleteCouponUseCase(repo);

export { repo as couponRepo };
