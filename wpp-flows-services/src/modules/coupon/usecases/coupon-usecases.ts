import { ConflictError, NotFoundError, ValidationError } from "@/shared/exceptions/http";
import type {
    Coupon,
    CouponInput,
    CouponRepository,
} from "../repositories/coupon-repo";

function validate(input: CouponInput): void {
    const code = input.code?.trim();
    if (!code) {
        throw new ValidationError("Informe o código do cupom.");
    }
    if (!/^[A-Z0-9_-]{2,40}$/i.test(code)) {
        throw new ValidationError(
            "Código inválido — use letras, números, hífens ou _ (2 a 40 caracteres).",
        );
    }
    const value = Number(input.discountValue);
    if (!Number.isFinite(value) || value <= 0) {
        throw new ValidationError("Informe o valor do desconto.");
    }
    if (input.discountType === "PERCENT" && value > 100) {
        throw new ValidationError("Desconto em % não pode passar de 100.");
    }
    if (input.validFrom && input.validUntil && input.validFrom > input.validUntil) {
        throw new ValidationError("A data de início é posterior à data de fim.");
    }
}

export class ListCouponsUseCase {
    constructor(private readonly repo: CouponRepository) {}
    execute(organizationId: string): Promise<Coupon[]> {
        return this.repo.listByOrg(organizationId);
    }
}

export class CreateCouponUseCase {
    constructor(private readonly repo: CouponRepository) {}
    async execute(input: {
        organizationId: string;
        data: CouponInput;
    }): Promise<Coupon> {
        validate(input.data);
        const existing = await this.repo.findByCodeInOrg(
            input.organizationId,
            input.data.code,
        );
        if (existing) {
            throw new ConflictError("Já existe um cupom com esse código.");
        }
        return this.repo.create(input.organizationId, input.data);
    }
}

export class UpdateCouponUseCase {
    constructor(private readonly repo: CouponRepository) {}
    async execute(input: {
        organizationId: string;
        id: string;
        data: Partial<CouponInput>;
    }): Promise<Coupon> {
        const current = await this.repo.findByIdInOrg(input.organizationId, input.id);
        if (!current) throw new NotFoundError("Coupon");

        const merged: CouponInput = {
            code: input.data.code ?? current.code,
            discountType: input.data.discountType ?? current.discountType,
            discountValue:
                input.data.discountValue ?? Number(current.discountValue),
            isActive: input.data.isActive ?? current.isActive,
            validFrom:
                input.data.validFrom !== undefined
                    ? input.data.validFrom
                    : current.validFrom,
            validUntil:
                input.data.validUntil !== undefined
                    ? input.data.validUntil
                    : current.validUntil,
            description:
                input.data.description !== undefined
                    ? input.data.description
                    : current.description,
        };
        validate(merged);

        if (input.data.code && input.data.code.toUpperCase() !== current.code) {
            const clash = await this.repo.findByCodeInOrg(
                input.organizationId,
                input.data.code,
            );
            if (clash && clash.id !== current.id) {
                throw new ConflictError("Já existe um cupom com esse código.");
            }
        }
        return this.repo.update(input.id, input.data);
    }
}

export class DeleteCouponUseCase {
    constructor(private readonly repo: CouponRepository) {}
    async execute(input: { organizationId: string; id: string }): Promise<void> {
        const current = await this.repo.findByIdInOrg(input.organizationId, input.id);
        if (!current) throw new NotFoundError("Coupon");
        await this.repo.delete(input.id);
    }
}
