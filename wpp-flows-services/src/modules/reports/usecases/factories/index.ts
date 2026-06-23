import { organizationRepo } from "@/modules/organization/usecases/factories";
import { PrismaReportRepository } from "../../repositories/prisma/prisma-report-repo";
import {
    GetDailyReportUseCase,
    ListDailyReportsUseCase,
} from "../daily-report-usecases";
import { DailyReportScheduler } from "../daily-report-scheduler";
import { GenerateDailyReportUseCase } from "../generate-daily-report";

const reportRepo = new PrismaReportRepository();

export const generateDailyReport = new GenerateDailyReportUseCase(reportRepo);

export const makeListDailyReports = () => new ListDailyReportsUseCase(reportRepo);
export const makeGetDailyReport = () =>
    new GetDailyReportUseCase(reportRepo, generateDailyReport);

export const dailyReportScheduler = new DailyReportScheduler(
    organizationRepo,
    reportRepo,
    generateDailyReport,
);

export { reportRepo };
