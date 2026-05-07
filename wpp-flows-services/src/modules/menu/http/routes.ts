import { CategoryController } from "./controllers/category-controller";
import { ItemController } from "./controllers/item-controller";

export const menuRoutes = [new CategoryController(), new ItemController()];
