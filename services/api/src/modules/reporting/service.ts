import { InventoryService } from "../inventory/service.js";
import { PosService } from "../pos/service.js";
import type { PosOrderRecord } from "../pos/types.js";
import { SettlementService } from "../settlement/service.js";

function orderAccountingSign(order: PosOrderRecord): number {
  if (order.orderType === "refund") {
    return -1;
  }

  if (order.orderType === "exchange") {
    return order.totalAmount >= 0 ? 1 : -1;
  }

  return 1;
}

function businessDateFromTimestamp(timestamp: string): string {
  return timestamp.slice(0, 10);
}

export class ReportingService {
  constructor(
    private readonly posService: PosService,
    private readonly inventoryService: InventoryService,
    private readonly settlementService: SettlementService
  ) {}

  getStoreSalesDailyReport() {
    const aggregates = new Map<
      string,
      {
        storeId: string;
        businessDate: string;
        grossSales: number;
        refundAmount: number;
        exchangeAmount: number;
        netSales: number;
      }
    >();

    for (const order of this.posService.listOrders().filter((entry) => entry.status === "paid")) {
      const businessDate = businessDateFromTimestamp(order.createdAt);
      const key = `${order.storeId}::${businessDate}`;
      const current = aggregates.get(key) ?? {
        storeId: order.storeId,
        businessDate,
        grossSales: 0,
        refundAmount: 0,
        exchangeAmount: 0,
        netSales: 0
      };

      if (order.orderType === "sale") {
        current.grossSales += order.totalAmount;
      } else if (order.orderType === "refund") {
        current.refundAmount += order.totalAmount;
      } else {
        current.exchangeAmount += order.totalAmount;
      }

      current.netSales += orderAccountingSign(order) * Math.abs(order.totalAmount);
      aggregates.set(key, current);
    }

    return [...aggregates.values()];
  }

  getInventoryDailyReport() {
    return this.inventoryService.listBalances();
  }

  getDayCloseExceptionReport() {
    return this.settlementService
      .listReconciliations()
      .filter((record) => record.status === "exception");
  }
}
