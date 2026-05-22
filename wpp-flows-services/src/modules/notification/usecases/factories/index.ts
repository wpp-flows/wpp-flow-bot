import { organizationRepo } from "@/modules/organization/usecases/factories";
import { PrismaNotificationRepository } from "../../repositories/prisma/prisma-notification-repo";
import { NotificationEmitter } from "../notification-emitter";
import {
    CountUnreadNotificationsUseCase,
    CreateNotificationUseCase,
    DeleteAllNotificationsUseCase,
    ListNotificationsUseCase,
    ListRecentNotificationsUseCase,
    MarkAllNotificationsReadUseCase,
    MarkNotificationReadUseCase,
} from "../notification-usecases";

const repo = new PrismaNotificationRepository();

export const createNotification = new CreateNotificationUseCase(repo);
export const notificationEmitter = new NotificationEmitter(
    organizationRepo,
    createNotification,
);

export const makeListRecentNotifications = () => new ListRecentNotificationsUseCase(repo);
export const makeListNotifications = () => new ListNotificationsUseCase(repo);
export const makeCountUnreadNotifications = () =>
    new CountUnreadNotificationsUseCase(repo);
export const makeMarkNotificationRead = () => new MarkNotificationReadUseCase(repo);
export const makeMarkAllNotificationsRead = () =>
    new MarkAllNotificationsReadUseCase(repo);
export const makeDeleteAllNotifications = () =>
    new DeleteAllNotificationsUseCase(repo);

export { repo as notificationRepo };
