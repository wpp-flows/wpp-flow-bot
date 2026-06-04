export type InvitationStatus = "PENDING" | "ACCEPTED" | "REVOKED" | "EXPIRED";

export interface Invitation {
    id: string;
    email: string;
    token: string;
    status: InvitationStatus;
    expiresAt: Date;
    acceptedAt: Date | null;
    invitedById: string;
    invitedByName: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface InvitationRepository {
    listByOrg(): Promise<Invitation[]>;
    findById(id: string): Promise<Invitation | null>;
    findByToken(token: string): Promise<Invitation | null>;
    findPendingByEmail(email: string): Promise<Invitation | null>;
    create(data: {
        email: string;
        token: string;
        expiresAt: Date;
        invitedById: string;
    }): Promise<Invitation>;
    setStatus(
        id: string,
        status: InvitationStatus,
        extras?: { acceptedAt?: Date },
    ): Promise<Invitation>;
}
