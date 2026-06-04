import { randomBytes } from "node:crypto";
import { prisma } from "@/infrastructure/database/client";
import { auth } from "@/infrastructure/auth/better-auth";
import { ValidationError } from "@/shared/exceptions/http";
import { sendEmail } from "@/shared/email/resend-client";
import { buildInvitationEmail } from "@/shared/email/templates/invitation-email";
import type {
    Invitation,
    InvitationRepository,
} from "../repositories/invitation-repo";

const INVITE_TTL_DAYS = 7;

export function isInvitationUsable(invitation: Invitation): boolean {
    if (invitation.status !== "PENDING") return false;
    return invitation.expiresAt.getTime() > Date.now();
}

export class CreateInvitationUseCase {
    constructor(
        private readonly repo: InvitationRepository,
    ) {}

    async execute(input: {
        email: string;
        invitedById: string;
        inviterName: string;
    }): Promise<Invitation> {
        const email = input.email.trim().toLowerCase();
        if (!/.+@.+\..+/.test(email)) {
            throw new ValidationError("E-mail inválido.");
        }

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            throw new ValidationError(
                "Já existe um usuário com este e-mail.",
            );
        }

        const open = await this.repo.findPendingByEmail(email);
        if (open) {
            await this.repo.setStatus(open.id, "REVOKED");
        }

        const token = randomBytes(32).toString("hex");
        const expiresAt = new Date(
            Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000,
        );
        const invitation = await this.repo.create({
            email,
            token,
            expiresAt,
            invitedById: input.invitedById,
        });

        const { subject, html } = buildInvitationEmail({
            inviterName: input.inviterName,
            inviteeEmail: email,
            token,
            expiresAt,
        });
        try {
            await sendEmail({ to: email, subject, html });
        } catch (err) {
            await this.repo.setStatus(invitation.id, "REVOKED");
            throw err;
        }
        return invitation;
    }
}

export class ListInvitationsUseCase {
    constructor(private readonly repo: InvitationRepository) {}
    execute(): Promise<Invitation[]> {
        return this.repo.listByOrg();
    }
}

export class RevokeInvitationUseCase {
    constructor(private readonly repo: InvitationRepository) {}
    async execute(id: string): Promise<Invitation> {
        const invite = await this.repo.findById(id);
        if (!invite) throw new ValidationError("Convite não encontrado.");
        if (invite.status === "ACCEPTED") {
            throw new ValidationError("Convite já aceito não pode ser revogado.");
        }
        return this.repo.setStatus(id, "REVOKED");
    }
}

export class ValidateInvitationTokenUseCase {
    constructor(private readonly repo: InvitationRepository) {}
    async execute(
        token: string,
    ): Promise<{ valid: boolean; email: string | null; expiresAt: string | null }> {
        const invite = await this.repo.findByToken(token);
        if (!invite || !isInvitationUsable(invite)) {
            return { valid: false, email: null, expiresAt: null };
        }
        return {
            valid: true,
            email: invite.email,
            expiresAt: invite.expiresAt.toISOString(),
        };
    }
}

export class AcceptInvitationUseCase {
    constructor(private readonly repo: InvitationRepository) {}
    async execute(input: {
        token: string;
        name: string;
        password: string;
    }): Promise<{ email: string }> {
        const invite = await this.repo.findByToken(input.token);
        if (!invite || !isInvitationUsable(invite)) {
            throw new ValidationError("Convite inválido ou expirado.");
        }
        const name = input.name.trim();
        if (name.length < 2) {
            throw new ValidationError("Nome muito curto.");
        }
        if (input.password.length < 8) {
            throw new ValidationError("Senha precisa de pelo menos 8 caracteres.");
        }

        await auth.api.signUpEmail({
            body: {
                name,
                email: invite.email,
                password: input.password,
            },
        });

        await this.repo.setStatus(invite.id, "ACCEPTED", {
            acceptedAt: new Date(),
        });
        return { email: invite.email };
    }
}
