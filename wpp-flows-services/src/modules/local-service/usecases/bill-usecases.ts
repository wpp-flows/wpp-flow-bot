import { NotFoundError, ValidationError } from "@/shared/exceptions/http";
import { orgEventBus } from "@/infrastructure/events/event-bus";
import type {
    Order,
    OrderRepository,
} from "@/modules/order/repositories/order-repo";
import type { WalletRepository } from "@/modules/payment/repositories/wallet-repo";
import type { BillRepository, TableBill } from "../repositories/bill-repo";
import type { TableRepository } from "../repositories/table-repo";

const ALLOWED_PAYMENT_METHODS = [
    "CASH",
    "CARD",
    "PIX",
    "OTHER",
] as const;
export type LocalPaymentMethod = (typeof ALLOWED_PAYMENT_METHODS)[number];

export interface ClosedBillResult {
    bill: TableBill;
    orders: Order[];
}

export class CloseBillUseCase {
    constructor(
        private readonly tables: TableRepository,
        private readonly orders: OrderRepository,
        private readonly bills: BillRepository,
        private readonly wallets: WalletRepository,
    ) {}

    async execute(input: {
        organizationId: string;
        tableId: string;
        paymentMethod: LocalPaymentMethod;
        notes?: string | null;
        closedById: string;
    }): Promise<ClosedBillResult> {
        const table = await this.tables.findByIdInOrg(
            input.organizationId,
            input.tableId,
        );
        if (!table) throw new NotFoundError("Mesa");

        const openOrders = await this.orders.listByOrg(input.organizationId, {
            tableId: input.tableId,
            unbilledOnly: true,
            serviceType: "LOCAL",
        });

        const billable = openOrders.filter((o) => o.status !== "CANCELED");
        if (billable.length === 0) {
            throw new ValidationError(
                "A mesa não tem pedidos para fechar.",
            );
        }

        const total = billable.reduce(
            (sum, o) => sum + Number.parseFloat(o.total || "0"),
            0,
        );

        const bill = await this.bills.create({
            organizationId: input.organizationId,
            tableId: input.tableId,
            total: total.toFixed(2),
            paymentMethod: input.paymentMethod,
            notes: input.notes?.trim() || null,
            closedById: input.closedById,
        });
        await this.orders.attachToBill(
            billable.map((o) => o.id),
            bill.id,
        );

        if (total > 0) {
            const wallet = await this.wallets.getOrCreate(input.organizationId);
            await this.wallets.appendTransaction({
                walletId: wallet.id,
                kind: "CREDIT",
                amount: total,
                status: "COMPLETED",
                billId: bill.id,
                serviceType: "LOCAL",
                note: `Mesa ${table.label} · ${humanMethod(input.paymentMethod)}`,
            });
        }

        await this.tables.update(input.tableId, {
            status: "EMPTY",
            billRequestedAt: null,
        });

        orgEventBus.emit(input.organizationId, {
            kind: "bill.closed",
            tableId: input.tableId,
            billId: bill.id,
        });
        orgEventBus.emit(input.organizationId, {
            kind: "table.updated",
            tableId: input.tableId,
        });

        return { bill, orders: billable };
    }
}

function humanMethod(m: LocalPaymentMethod): string {
    switch (m) {
        case "CASH":
            return "Dinheiro";
        case "CARD":
            return "Cartão";
        case "PIX":
            return "Pix";
        default:
            return "Outro";
    }
}

export class ListBillsUseCase {
    constructor(private readonly bills: BillRepository) {}
    execute(organizationId: string): Promise<TableBill[]> {
        return this.bills.listByOrg(organizationId);
    }
}

export class GetBillUseCase {
    constructor(
        private readonly bills: BillRepository,
        private readonly orders: OrderRepository,
    ) {}
    async execute(input: {
        organizationId: string;
        id: string;
    }): Promise<ClosedBillResult> {
        const bill = await this.bills.findById(input.id);
        if (!bill || bill.organizationId !== input.organizationId) {
            throw new NotFoundError("Conta");
        }
        
        const orders = await this.orders.listByOrg(input.organizationId, {});
        return {
            bill,
            orders: orders.filter((o) => o.billId === bill.id),
        };
    }
}
