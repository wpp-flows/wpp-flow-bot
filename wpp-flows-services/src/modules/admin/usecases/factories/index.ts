import { PrismaInvitationRepository } from "../../repositories/prisma/prisma-invitation-repo";
import {
    AcceptInvitationUseCase,
    CreateInvitationUseCase,
    ListInvitationsUseCase,
    RevokeInvitationUseCase,
    ValidateInvitationTokenUseCase,
} from "../invitation-usecases";

const repo = new PrismaInvitationRepository();

export const makeCreateInvitation = () => new CreateInvitationUseCase(repo);
export const makeListInvitations = () => new ListInvitationsUseCase(repo);
export const makeRevokeInvitation = () => new RevokeInvitationUseCase(repo);
export const makeValidateInvitationToken = () =>
    new ValidateInvitationTokenUseCase(repo);
export const makeAcceptInvitation = () => new AcceptInvitationUseCase(repo);

export { repo as invitationRepo };
