import type { ReportPageDefinition } from "./types.js";

export const dayCloseExceptionsReportPage: ReportPageDefinition = {
  key: "report-day-close-exceptions",
  title: "日结异常报表",
  path: "/reports/day-close-exceptions",
  listEndpoint: "/reports/day-close-exceptions",
  columns: [
    {
      key: "shiftId",
      label: "班次号"
    },
    {
      key: "status",
      label: "状态"
    },
    {
      key: "callbackAdjustmentTotal",
      label: "延迟回调调整"
    }
  ]
};
