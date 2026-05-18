import { PrismaPromotionRepository } from "../../repositories/prisma/prisma-promotion-repo";
import {
    CreatePromotionUseCase,
    DeletePromotionUseCase,
    ListPromotionsUseCase,
    UpdatePromotionUseCase,
} from "../promotion-usecases";

const repo = new PrismaPromotionRepository();

export const makeListPromotions = () => new ListPromotionsUseCase(repo);
export const makeCreatePromotion = () => new CreatePromotionUseCase(repo);
export const makeUpdatePromotion = () => new UpdatePromotionUseCase(repo);
export const makeDeletePromotion = () => new DeletePromotionUseCase(repo);

export { repo as promotionRepo };
