import {
    GetDailyReportUseCase,
    ListDailyReportsUseCase,
} from "../daily-report-usecases";

export const makeListDailyReports = () => new ListDailyReportsUseCase();
export const makeGetDailyReport = () => new GetDailyReportUseCase();
