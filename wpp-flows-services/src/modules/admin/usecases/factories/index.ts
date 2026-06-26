import { PrismaAdminNotificationRepository } from "../../repositories/prisma/prisma-admin-notification-repo";
import { PrismaInvitationRepository } from "../../repositories/prisma/prisma-invitation-repo";
import {
    CreateAdminNotificationUseCase,
    ListAdminNotificationsUseCase,
    MarkAdminNotificationReadUseCase,
    MarkAllAdminNotificationsReadUseCase,
} from "../admin-notification-usecases";
import {
    AcceptInvitationUseCase,
    CreateInvitationUseCase,
    ListInvitationsUseCase,
    RevokeInvitationUseCase,
    ValidateInvitationTokenUseCase,
} from "../invitation-usecases";

const repo = new PrismaInvitationRepository();
const adminNotificationRepo = new PrismaAdminNotificationRepository();

export const makeCreateInvitation = () => new CreateInvitationUseCase(repo);
export const makeListInvitations = () => new ListInvitationsUseCase(repo);
export const makeRevokeInvitation = () => new RevokeInvitationUseCase(repo);
export const makeValidateInvitationToken = () =>
    new ValidateInvitationTokenUseCase(repo);
export const makeAcceptInvitation = () => new AcceptInvitationUseCase(repo);

export const makeListAdminNotifications = () =>
    new ListAdminNotificationsUseCase(adminNotificationRepo);
export const makeCreateAdminNotification = () =>
    new CreateAdminNotificationUseCase(adminNotificationRepo);
export const makeMarkAdminNotificationRead = () =>
    new MarkAdminNotificationReadUseCase(adminNotificationRepo);
export const makeMarkAllAdminNotificationsRead = () =>
    new MarkAllAdminNotificationsReadUseCase(adminNotificationRepo);

export { repo as invitationRepo, adminNotificationRepo };
