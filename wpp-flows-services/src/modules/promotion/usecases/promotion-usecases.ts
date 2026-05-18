import { NotFoundError, ValidationError } from "@/shared/exceptions/http";
import type {
    Promotion,
    PromotionInput,
    PromotionRepository,
} from "../repositories/promotion-repo";

function validate(input: PromotionInput): void {
    if (input.kind === "NTH_ORDER_DISCOUNT") {
        if (!input.nthOrder || input.nthOrder <= 0) {
            throw new ValidationError(
                "Informe o número do pedido (Nth) para esta promoção.",
            );
        }
        if (!input.discountType) {
            throw new ValidationError("Selecione o tipo de desconto (% ou valor).");
        }
        const value = Number(input.discountValue ?? 0);
        if (!Number.isFinite(value) || value <= 0) {
            throw new ValidationError("Informe o valor do desconto.");
        }
        if (input.discountType === "PERCENT" && value > 100) {
            throw new ValidationError("Desconto em % não pode passar de 100.");
        }
    }
    if (input.kind === "DAILY_MESSAGE") {
        if (!input.message?.trim()) {
            throw new ValidationError(
                "Informe a mensagem da promoção do dia.",
            );
        }
    }
}

export class ListPromotionsUseCase {
    constructor(private readonly repo: PromotionRepository) {}
    execute(organizationId: string): Promise<Promotion[]> {
        return this.repo.listByOrg(organizationId);
    }
}

export class CreatePromotionUseCase {
    constructor(private readonly repo: PromotionRepository) {}
    execute(input: {
        organizationId: string;
        data: PromotionInput;
    }): Promise<Promotion> {
        validate(input.data);
        return this.repo.create(input.organizationId, input.data);
    }
}

export class UpdatePromotionUseCase {
    constructor(private readonly repo: PromotionRepository) {}
    async execute(input: {
        organizationId: string;
        id: string;
        data: Partial<PromotionInput>;
    }): Promise<Promotion> {
        const existing = await this.repo.findByIdInOrg(
            input.organizationId,
            input.id,
        );
        if (!existing) throw new NotFoundError("Promotion");
        // Re-validate using the merged shape.
        validate({ ...existing, ...input.data } as PromotionInput);
        return this.repo.update(input.id, input.data);
    }
}

export class DeletePromotionUseCase {
    constructor(private readonly repo: PromotionRepository) {}
    async execute(input: {
        organizationId: string;
        id: string;
    }): Promise<void> {
        const existing = await this.repo.findByIdInOrg(
            input.organizationId,
            input.id,
        );
        if (!existing) throw new NotFoundError("Promotion");
        await this.repo.delete(input.id);
    }
}
