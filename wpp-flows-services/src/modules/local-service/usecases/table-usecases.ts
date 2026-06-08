import { randomBytes } from "node:crypto";
import { NotFoundError, ValidationError } from "@/shared/exceptions/http";
import type { OrderRepository } from "@/modules/order/repositories/order-repo";
import type {
    RestaurantTable,
    TableRepository,
} from "../repositories/table-repo";

function newQrToken(): string {
    return randomBytes(32).toString("hex");
}

export class ListTablesUseCase {
    constructor(private readonly repo: TableRepository) {}
    execute(organizationId: string): Promise<RestaurantTable[]> {
        return this.repo.listByOrg(organizationId);
    }
}

export class GetTableUseCase {
    constructor(private readonly repo: TableRepository) {}
    async execute(input: {
        organizationId: string;
        id: string;
    }): Promise<RestaurantTable> {
        const t = await this.repo.findByIdInOrg(input.organizationId, input.id);
        if (!t) throw new NotFoundError("Mesa");
        return t;
    }
}

export class CreateTableUseCase {
    constructor(private readonly repo: TableRepository) {}
    async execute(input: {
        organizationId: string;
        label: string;
        seats?: number | null;
        notes?: string | null;
        position?: number;
    }): Promise<RestaurantTable> {
        const label = input.label.trim();
        if (label.length < 1) throw new ValidationError("Informe um nome para a mesa.");
        if (label.length > 60) throw new ValidationError("Nome muito longo.");
        return this.repo.create({
            organizationId: input.organizationId,
            label,
            qrToken: newQrToken(),
            position: input.position,
            seats: input.seats ?? null,
            notes: input.notes?.trim() ?? null,
        });
    }
}

export class UpdateTableUseCase {
    constructor(private readonly repo: TableRepository) {}
    async execute(input: {
        organizationId: string;
        id: string;
        label?: string;
        seats?: number | null;
        notes?: string | null;
        position?: number;
    }): Promise<RestaurantTable> {
        const t = await this.repo.findByIdInOrg(input.organizationId, input.id);
        if (!t) throw new NotFoundError("Mesa");
        return this.repo.update(input.id, {
            ...(input.label !== undefined ? { label: input.label.trim() } : {}),
            ...(input.position !== undefined ? { position: input.position } : {}),
            ...(input.seats !== undefined ? { seats: input.seats } : {}),
            ...(input.notes !== undefined
                ? { notes: input.notes === null ? null : input.notes.trim() }
                : {}),
        });
    }
}

export class RegenerateQrTokenUseCase {
    constructor(private readonly repo: TableRepository) {}
    async execute(input: {
        organizationId: string;
        id: string;
    }): Promise<RestaurantTable> {
        const t = await this.repo.findByIdInOrg(input.organizationId, input.id);
        if (!t) throw new NotFoundError("Mesa");
        return this.repo.update(input.id, { qrToken: newQrToken() });
    }
}

export class DeleteTableUseCase {
    constructor(
        private readonly repo: TableRepository,
        private readonly orderRepo: OrderRepository,
    ) {}
    async execute(input: { organizationId: string; id: string }): Promise<void> {
        const t = await this.repo.findByIdInOrg(input.organizationId, input.id);
        if (!t) throw new NotFoundError("Mesa");

        const open = await this.orderRepo.listByOrg(input.organizationId, {
            tableId: input.id,
            unbilledOnly: true,
        });
        if (open.length > 0) {
            throw new ValidationError(
                "Não é possível excluir uma mesa com pedidos abertos. Feche a conta primeiro.",
            );
        }
        await this.repo.delete(input.id);
    }
}

export class RequestBillUseCase {
    constructor(private readonly repo: TableRepository) {}
    async execute(token: string): Promise<RestaurantTable> {
        const t = await this.repo.findByToken(token);
        if (!t) throw new NotFoundError("Mesa");
        if (t.billRequestedAt) return t;
        return this.repo.update(t.id, {
            billRequestedAt: new Date(),
            status: "BILL_REQUESTED",
        });
    }
}
