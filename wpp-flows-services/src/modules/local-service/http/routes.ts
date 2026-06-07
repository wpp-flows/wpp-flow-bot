import { LocalServiceController } from "./controllers/local-service-controller";
import { PublicTableController } from "./controllers/public-table-controller";

export const localServiceRoutes = [
    new LocalServiceController(),
    new PublicTableController(),
];
