import { AdminController } from "./controllers/admin-controller";
import { InvitationPublicController } from "./controllers/invitation-public-controller";

export const adminRoutes = [
    new AdminController(),
    new InvitationPublicController(),
];
