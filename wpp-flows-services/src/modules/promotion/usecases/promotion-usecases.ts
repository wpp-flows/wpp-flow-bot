import { NotFoundError, ValidationError } from "@/shared/exceptions/http";
import type {
    BundleConfig,
    Promotion,
    PromotionInput,
    PromotionRepository,
} from "../repositories/promotion-repo";

function validateNthOrder(input: PromotionInput): void {
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

function validateDailyMessage(input: PromotionInput): void {
    if (!input.message?.trim()) {
        throw new ValidationError("Informe a mensagem da promoção do dia.");
    }
}

function validateBundleComponents(bundle: BundleConfig): void {
    for (const component of bundle.components) {
        if (!component.label.trim()) {
            throw new ValidationError(
                "Cada componente do combo precisa de um rótulo.",
            );
        }
        if (component.count <= 0) {
            throw new ValidationError(
                `O componente "${component.label}" precisa de pelo menos 1 item.`,
            );
        }
        if (component.itemIds.length === 0) {
            throw new ValidationError(
                `Selecione pelo menos um item para "${component.label}".`,
            );
        }
    }
}

function validateBundleQuestions(bundle: BundleConfig): void {
    const fieldKeys = new Set<string>();
    for (const q of bundle.questions ?? []) {
        if (fieldKeys.has(q.fieldKey)) {
            throw new ValidationError(
                `Pergunta com chave duplicada: ${q.fieldKey}`,
            );
        }
        fieldKeys.add(q.fieldKey);
    }
}

function validateBundle(input: PromotionInput): void {
    const bundle = input.bundle;
    if (!bundle || bundle.components.length === 0) {
        throw new ValidationError(
            "Informe pelo menos um componente para o combo.",
        );
    }
    const price = Number(bundle.price);
    if (!Number.isFinite(price) || price < 0) {
        throw new ValidationError("Informe o preço do combo.");
    }
    validateBundleComponents(bundle);
    validateBundleQuestions(bundle);
}

function validate(input: PromotionInput): void {
    switch (input.kind) {
        case "NTH_ORDER_DISCOUNT":
            return validateNthOrder(input);
        case "DAILY_MESSAGE":
            return validateDailyMessage(input);
        case "BUNDLE":
            return validateBundle(input);
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
        validate({ ...existing, ...input.data });
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
