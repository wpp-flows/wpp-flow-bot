import { prisma } from "@/infrastructure/database/client";
import type {
    Invitation,
    InvitationRepository,
    InvitationStatus,
} from "../invitation-repo";

const include = { invitedBy: { select: { name: true } } } as const;

function toInvitation(row: any): Invitation {
    return {
        id: row.id,
        email: row.email,
        token: row.token,
        status: row.status as InvitationStatus,
        expiresAt: row.expiresAt,
        acceptedAt: row.acceptedAt ?? null,
        invitedById: row.invitedById,
        invitedByName: row.invitedBy?.name ?? null,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}

export class PrismaInvitationRepository implements InvitationRepository {
    async listByOrg(): Promise<Invitation[]> {
        const rows = await prisma.invitation.findMany({
            include,
            orderBy: { createdAt: "desc" },
        });
        return rows.map(toInvitation);
    }

    async findById(id: string): Promise<Invitation | null> {
        const row = await prisma.invitation.findUnique({ where: { id }, include });
        return row ? toInvitation(row) : null;
    }

    async findByToken(token: string): Promise<Invitation | null> {
        const row = await prisma.invitation.findUnique({
            where: { token },
            include,
        });
        return row ? toInvitation(row) : null;
    }

    async findPendingByEmail(email: string): Promise<Invitation | null> {
        const row = await prisma.invitation.findFirst({
            where: { email: email.toLowerCase(), status: "PENDING" },
            orderBy: { createdAt: "desc" },
            include,
        });
        return row ? toInvitation(row) : null;
    }

    async create(data: {
        email: string;
        token: string;
        expiresAt: Date;
        invitedById: string;
    }): Promise<Invitation> {
        const row = await prisma.invitation.create({
            data: {
                email: data.email.toLowerCase(),
                token: data.token,
                expiresAt: data.expiresAt,
                invitedById: data.invitedById,
            },
            include,
        });
        return toInvitation(row);
    }

    async setStatus(
        id: string,
        status: InvitationStatus,
        extras?: { acceptedAt?: Date },
    ): Promise<Invitation> {
        const row = await prisma.invitation.update({
            where: { id },
            data: {
                status,
                ...(extras?.acceptedAt ? { acceptedAt: extras.acceptedAt } : {}),
            },
            include,
        });
        return toInvitation(row);
    }
}
