import { AdminController } from "./controllers/admin-controller";
import { AdminNotificationController } from "./controllers/admin-notification-controller";
import { InvitationPublicController } from "./controllers/invitation-public-controller";

export const adminRoutes = [
    new AdminController(),
    new AdminNotificationController(),
    new InvitationPublicController(),
];
