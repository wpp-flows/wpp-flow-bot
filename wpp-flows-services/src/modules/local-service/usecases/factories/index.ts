import { orderRepo } from "@/modules/order/usecases/factories";
import { walletRepo } from "@/modules/payment/usecases/factories";
import { PrismaBillRepository } from "../../repositories/prisma/prisma-bill-repo";
import { PrismaTableRepository } from "../../repositories/prisma/prisma-table-repo";
import {
    CloseBillUseCase,
    GetBillUseCase,
    ListBillsUseCase,
} from "../bill-usecases";
import {
    CreateTableUseCase,
    DeleteTableUseCase,
    GetTableUseCase,
    ListTablesUseCase,
    RegenerateQrTokenUseCase,
    RequestBillUseCase,
    UpdateTableUseCase,
} from "../table-usecases";

const tableRepo = new PrismaTableRepository();
const billRepo = new PrismaBillRepository();

export const makeListTables = () => new ListTablesUseCase(tableRepo);
export const makeGetTable = () => new GetTableUseCase(tableRepo);
export const makeCreateTable = () => new CreateTableUseCase(tableRepo);
export const makeUpdateTable = () => new UpdateTableUseCase(tableRepo);
export const makeRegenerateQrToken = () =>
    new RegenerateQrTokenUseCase(tableRepo);
export const makeDeleteTable = () =>
    new DeleteTableUseCase(tableRepo, orderRepo);
export const makeRequestBill = () => new RequestBillUseCase(tableRepo);
export const makeCloseBill = () =>
    new CloseBillUseCase(tableRepo, orderRepo, billRepo, walletRepo);
export const makeListBills = () => new ListBillsUseCase(billRepo);
export const makeGetBill = () => new GetBillUseCase(billRepo, orderRepo);

export { tableRepo, billRepo };
