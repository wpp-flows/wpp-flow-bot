import { PrismaCategoryRepository } from "../../repositories/prisma/prisma-category-repo";
import { PrismaItemRepository } from "../../repositories/prisma/prisma-item-repo";
import {
    CreateCategoryUseCase,
    DeleteCategoryUseCase,
    ListCategoriesUseCase,
    ReorderCategoriesUseCase,
    UpdateCategoryUseCase,
} from "../category-usecases";
import {
    CreateItemUseCase,
    DeleteItemUseCase,
    ListItemsUseCase,
    ReorderItemsUseCase,
    UpdateItemUseCase,
} from "../item-usecases";

const categoryRepo = new PrismaCategoryRepository();
const itemRepo = new PrismaItemRepository();

export const makeListCategories = () => new ListCategoriesUseCase(categoryRepo);
export const makeCreateCategory = () => new CreateCategoryUseCase(categoryRepo);
export const makeUpdateCategory = () => new UpdateCategoryUseCase(categoryRepo);
export const makeDeleteCategory = () => new DeleteCategoryUseCase(categoryRepo);
export const makeReorderCategories = () =>
    new ReorderCategoriesUseCase(categoryRepo);

export const makeListItems = () => new ListItemsUseCase(itemRepo);
export const makeCreateItem = () => new CreateItemUseCase(itemRepo, categoryRepo);
export const makeUpdateItem = () => new UpdateItemUseCase(itemRepo, categoryRepo);
export const makeDeleteItem = () => new DeleteItemUseCase(itemRepo);
export const makeReorderItems = () =>
    new ReorderItemsUseCase(itemRepo, categoryRepo);
