import { AuditService } from "./modules/audit/service.js";
import { AuthService } from "./modules/auth/service.js";
import type { AuthSession, UserRole } from "./modules/auth/types.js";
import { HealthService } from "./modules/health/service.js";
import { InventoryError } from "./modules/inventory/errors.js";
import { InventoryService } from "./modules/inventory/service.js";
import { normalizeMockMarketplacePayload } from "./modules/integrations/mock-marketplace/adapter.js";
import type {
  InventoryCountAdjustmentInput,
  InventoryQuantityInput,
  InventoryTransferInput
} from "./modules/inventory/types.js";
import {
  isInventoryOperationType,
  isInventoryStockStatus
} from "./modules/inventory/types.js";
import { MasterDataError } from "./modules/master-data/errors.js";
import { MasterDataService } from "./modules/master-data/service.js";
import type {
  CreatePriceInput,
  CreateSkuInput,
  CreateStoreInput,
  CreateWarehouseInput
} from "./modules/master-data/types.js";
import { MetricsService } from "./modules/metrics/service.js";
import { PosError } from "./modules/pos/errors.js";
import { PosService } from "./modules/pos/service.js";
import type {
  CloseShiftInput,
  CreatePosExchangeInput,
  CreatePosRefundInput,
  CreatePosSaleInput,
  DayCloseInput,
  OpenShiftInput
} from "./modules/pos/types.js";
import { OmniOrderError } from "./modules/omni-order/errors.js";
import { OmniOrderService } from "./modules/omni-order/service.js";
import type { OmniOrderRetryInput } from "./modules/omni-order/types.js";
import { ReportingService } from "./modules/reporting/service.js";
import { RbacService } from "./modules/rbac/service.js";
import { SettlementError } from "./modules/settlement/errors.js";
import { SettlementService } from "./modules/settlement/service.js";
import type {
  SettlementPaymentCallbackInput,
  SettlementReconciliationInput
} from "./modules/settlement/types.js";

interface StoreRecord {
  id: string;
  name: string;
}

interface CreateAppOptions {
  authService?: AuthService;
  rbacService?: RbacService;
  auditService?: AuditService;
  masterDataService?: MasterDataService;
  inventoryService?: InventoryService;
  posService?: PosService;
  omniOrderService?: OmniOrderService;
  settlementService?: SettlementService;
  reportingService?: ReportingService;
  metricsService?: MetricsService;
  healthService?: HealthService;
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json"
    }
  });
}

function textResponse(status: number, body: string, contentType: string): Response {
  return new Response(body, {
    status,
    headers: {
      "content-type": contentType
    }
  });
}

function masterDataErrorResponse(error: unknown, metricsService?: MetricsService): Response {
  if (error instanceof MasterDataError) {
    metricsService?.recordApiError(error.code);
    return jsonResponse(error.status, {
      error: error.code
    });
  }

  throw error;
}

function inventoryErrorResponse(error: unknown, metricsService?: MetricsService): Response {
  if (error instanceof InventoryError) {
    metricsService?.recordApiError(error.code);
    return jsonResponse(error.status, {
      error: error.code
    });
  }

  throw error;
}

function posErrorResponse(error: unknown, metricsService?: MetricsService): Response {
  if (error instanceof PosError) {
    metricsService?.recordApiError(error.code);
    return jsonResponse(error.status, {
      error: error.code
    });
  }

  throw error;
}

function omniOrderErrorResponse(error: unknown, metricsService?: MetricsService): Response {
  if (error instanceof OmniOrderError) {
    metricsService?.recordApiError(error.code);
    return jsonResponse(error.status, {
      error: error.code
    });
  }

  throw error;
}

function settlementErrorResponse(error: unknown, metricsService?: MetricsService): Response {
  if (error instanceof SettlementError) {
    metricsService?.recordApiError(error.code);
    return jsonResponse(error.status, {
      error: error.code
    });
  }

  throw error;
}

async function readJson<T>(request: Request): Promise<T> {
  return (await request.json()) as T;
}

function readBearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length);
}

export class RetailApiApp {
  private readonly stores = new Map<string, StoreRecord>();

  constructor(
    private readonly authService: AuthService,
    private readonly rbacService: RbacService,
    private readonly auditService: AuditService,
    private readonly masterDataService: MasterDataService,
    private readonly inventoryService: InventoryService,
    private readonly posService: PosService,
    private readonly omniOrderService: OmniOrderService,
    private readonly settlementService: SettlementService,
    private readonly reportingService: ReportingService,
    private readonly metricsService: MetricsService,
    private readonly healthService: HealthService
  ) {}

  async handle(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health/live") {
      return jsonResponse(200, this.healthService.getLiveness());
    }

    if (request.method === "GET" && url.pathname === "/health/ready") {
      return jsonResponse(200, this.healthService.getReadiness());
    }

    if (request.method === "GET" && url.pathname === "/metrics") {
      return textResponse(
        200,
        this.metricsService.scrape(),
        "text/plain; version=0.0.4; charset=utf-8"
      );
    }

    if (request.method === "POST" && url.pathname === "/auth/login") {
      const payload = await readJson<{ username: string; password: string }>(request);
      const result = this.authService.login(payload.username, payload.password);

      if (!result) {
        this.metricsService.recordApiError("invalid_credentials");
        return jsonResponse(401, {
          error: "invalid_credentials"
        });
      }

      return jsonResponse(200, result);
    }

    if (request.method === "GET" && url.pathname === "/admin/ping") {
      return this.handleRoleProtected(request, ["admin"], async () =>
        jsonResponse(200, {
          ok: true
        })
      );
    }

    if (request.method === "POST" && url.pathname === "/stores") {
      return this.handleRoleProtected(request, ["admin"], async (session) => {
        const payload = await readJson<{ storeId: string; name: string }>(request);
        const store: StoreRecord = {
          id: payload.storeId,
          name: payload.name
        };

        this.stores.set(store.id, store);
        this.auditService.record({
          action: "store.create",
          resource: "store",
          resourceId: store.id,
          actor: {
            id: session.id,
            username: session.username,
            role: session.role
          },
          after: store
        });

        return jsonResponse(201, store);
      });
    }

    if (request.method === "GET" && url.pathname === "/audit-logs") {
      return this.handleRoleProtected(request, ["admin"], async () =>
        jsonResponse(200, {
          entries: this.auditService.list()
        })
      );
    }

    if (request.method === "GET" && url.pathname === "/master-data/stores") {
      return this.handleRoleProtected(request, ["admin"], async () =>
        jsonResponse(200, {
          items: this.masterDataService.listStores()
        })
      );
    }

    if (request.method === "POST" && url.pathname === "/master-data/stores") {
      return this.handleRoleProtected(request, ["admin"], async (session) => {
        try {
          const payload = await readJson<CreateStoreInput>(request);
          const store = this.masterDataService.createStore(payload);
          this.auditService.record({
            action: "master_data.store.create",
            resource: "store",
            resourceId: store.id,
            actor: {
              id: session.id,
              username: session.username,
              role: session.role
            },
            after: store
          });

          return jsonResponse(201, store);
        } catch (error) {
          return masterDataErrorResponse(error, this.metricsService);
        }
      });
    }

    if (request.method === "GET" && url.pathname === "/master-data/warehouses") {
      return this.handleRoleProtected(request, ["admin"], async () =>
        jsonResponse(200, {
          items: this.masterDataService.listWarehouses()
        })
      );
    }

    if (request.method === "POST" && url.pathname === "/master-data/warehouses") {
      return this.handleRoleProtected(request, ["admin"], async (session) => {
        try {
          const payload = await readJson<CreateWarehouseInput>(request);
          const warehouse = this.masterDataService.createWarehouse(payload);
          this.auditService.record({
            action: "master_data.warehouse.create",
            resource: "warehouse",
            resourceId: warehouse.id,
            actor: {
              id: session.id,
              username: session.username,
              role: session.role
            },
            after: warehouse
          });

          return jsonResponse(201, warehouse);
        } catch (error) {
          return masterDataErrorResponse(error, this.metricsService);
        }
      });
    }

    if (request.method === "GET" && url.pathname === "/master-data/skus") {
      return this.handleRoleProtected(request, ["admin"], async () =>
        jsonResponse(200, {
          items: this.masterDataService.listSkus()
        })
      );
    }

    if (request.method === "POST" && url.pathname === "/master-data/skus") {
      return this.handleRoleProtected(request, ["admin"], async (session) => {
        try {
          const payload = await readJson<CreateSkuInput>(request);
          const sku = this.masterDataService.createSku(payload);
          this.auditService.record({
            action: "master_data.sku.create",
            resource: "sku",
            resourceId: sku.id,
            actor: {
              id: session.id,
              username: session.username,
              role: session.role
            },
            after: sku
          });

          return jsonResponse(201, sku);
        } catch (error) {
          return masterDataErrorResponse(error, this.metricsService);
        }
      });
    }

    if (request.method === "GET" && url.pathname === "/master-data/prices") {
      return this.handleRoleProtected(request, ["admin"], async () =>
        jsonResponse(200, {
          items: this.masterDataService.listPrices()
        })
      );
    }

    if (request.method === "POST" && url.pathname === "/master-data/prices") {
      return this.handleRoleProtected(request, ["admin"], async (session) => {
        try {
          const payload = await readJson<CreatePriceInput>(request);
          const price = this.masterDataService.createPrice(payload);
          this.auditService.record({
            action: "master_data.price.create",
            resource: "price",
            resourceId: price.id,
            actor: {
              id: session.id,
              username: session.username,
              role: session.role
            },
            after: price
          });

          return jsonResponse(201, price);
        } catch (error) {
          return masterDataErrorResponse(error, this.metricsService);
        }
      });
    }

    if (request.method === "GET" && url.pathname === "/inventory/balances") {
      return this.handleRoleProtected(request, ["admin"], async () => {
        const stockStatus = url.searchParams.get("stockStatus");

        return jsonResponse(200, {
          items: this.inventoryService.listBalances({
            warehouseId: url.searchParams.get("warehouseId") ?? undefined,
            skuId: url.searchParams.get("skuId") ?? undefined,
            stockStatus: stockStatus && isInventoryStockStatus(stockStatus) ? stockStatus : undefined
          })
        });
      });
    }

    if (request.method === "GET" && url.pathname === "/inventory/transactions") {
      return this.handleRoleProtected(request, ["admin"], async () => {
        const stockStatus = url.searchParams.get("stockStatus");
        const operationType = url.searchParams.get("operationType");

        return jsonResponse(200, {
          items: this.inventoryService.listTransactions({
            warehouseId: url.searchParams.get("warehouseId") ?? undefined,
            skuId: url.searchParams.get("skuId") ?? undefined,
            stockStatus: stockStatus && isInventoryStockStatus(stockStatus) ? stockStatus : undefined,
            operationType:
              operationType && isInventoryOperationType(operationType) ? operationType : undefined
          })
        });
      });
    }

    if (request.method === "POST" && url.pathname === "/inventory/inbounds") {
      return this.handleInventoryWrite(request, "inventory.inbound", async () =>
        this.inventoryService.createInbound(await readJson<InventoryQuantityInput>(request))
      );
    }

    if (request.method === "POST" && url.pathname === "/inventory/outbounds") {
      return this.handleInventoryWrite(request, "inventory.outbound", async () =>
        this.inventoryService.createOutbound(await readJson<InventoryQuantityInput>(request))
      );
    }

    if (request.method === "POST" && url.pathname === "/inventory/transfers") {
      return this.handleInventoryWrite(request, "inventory.transfer", async () =>
        this.inventoryService.createTransfer(await readJson<InventoryTransferInput>(request))
      );
    }

    if (request.method === "POST" && url.pathname === "/inventory/reservations") {
      return this.handleInventoryWrite(request, "inventory.reserve", async () =>
        this.inventoryService.createReservation(await readJson<InventoryQuantityInput>(request))
      );
    }

    if (request.method === "POST" && url.pathname === "/inventory/reservations/release") {
      return this.handleInventoryWrite(request, "inventory.release", async () =>
        this.inventoryService.releaseReservation(await readJson<InventoryQuantityInput>(request))
      );
    }

    if (request.method === "POST" && url.pathname === "/inventory/count-adjustments") {
      return this.handleInventoryWrite(request, "inventory.count_adjustment", async () =>
        this.inventoryService.createCountAdjustment(
          await readJson<InventoryCountAdjustmentInput>(request)
        )
      );
    }

    if (request.method === "POST" && url.pathname === "/pos/shifts/open") {
      return this.handlePosWrite(request, "pos.shift.open", async (session) =>
        this.posService.openShift(await readJson<OpenShiftInput>(request), session.id)
      );
    }

    if (request.method === "POST" && url.pathname === "/pos/shifts/close") {
      return this.handlePosWrite(request, "pos.shift.close", async () =>
        this.posService.closeShift(await readJson<CloseShiftInput>(request))
      );
    }

    if (request.method === "POST" && url.pathname === "/pos/orders/sales") {
      return this.handlePosWrite(request, "pos.order.sale", async () =>
        this.posService.createSale(await readJson<CreatePosSaleInput>(request))
      );
    }

    if (request.method === "POST" && url.pathname === "/pos/orders/refunds") {
      return this.handlePosWrite(request, "pos.order.refund", async () =>
        this.posService.createRefund(await readJson<CreatePosRefundInput>(request))
      );
    }

    if (request.method === "POST" && url.pathname === "/pos/orders/exchanges") {
      return this.handlePosWrite(request, "pos.order.exchange", async () =>
        this.posService.createExchange(await readJson<CreatePosExchangeInput>(request))
      );
    }

    if (request.method === "POST" && url.pathname === "/pos/day-close") {
      return this.handlePosWrite(request, "pos.day_close", async () =>
        this.posService.createDayClose(await readJson<DayCloseInput>(request))
      );
    }

    if (request.method === "GET" && url.pathname === "/omni-orders") {
      return this.handleRoleProtected(request, ["admin"], async () =>
        jsonResponse(200, {
          items: this.omniOrderService.listOrders()
        })
      );
    }

    if (request.method === "GET" && url.pathname.startsWith("/omni-orders/")) {
      return this.handleRoleProtected(request, ["admin"], async () => {
        const externalOrderId = url.pathname.replace("/omni-orders/", "");
        const order = this.omniOrderService.getOrder(externalOrderId);
        if (!order) {
          return jsonResponse(404, {
            error: "omni_order_not_found"
          });
        }

        return jsonResponse(200, order);
      });
    }

    if (request.method === "POST" && url.pathname === "/omni-orders/sync/mock-marketplace") {
      return this.handleOmniOrderWrite(request, "omni_order.sync", async () => {
        const payload = normalizeMockMarketplacePayload(await readJson(request));
        return this.omniOrderService.syncOrder(payload);
      });
    }

    if (request.method === "POST" && url.pathname === "/omni-orders/retry") {
      return this.handleOmniOrderWrite(request, "omni_order.retry", async () =>
        this.omniOrderService.retryReservation(await readJson<OmniOrderRetryInput>(request))
      );
    }

    if (request.method === "GET" && url.pathname === "/settlement/reconciliations") {
      return this.handleRoleProtected(request, ["admin"], async () =>
        jsonResponse(200, {
          items: this.settlementService.listReconciliations()
        })
      );
    }

    if (request.method === "POST" && url.pathname === "/settlement/reconciliations") {
      return this.handleSettlementWrite(request, "settlement.reconcile", async () =>
        this.settlementService.reconcileShift(await readJson<SettlementReconciliationInput>(request))
      );
    }

    if (request.method === "GET" && url.pathname === "/settlement/vouchers") {
      return this.handleRoleProtected(request, ["admin"], async () =>
        jsonResponse(200, {
          items: this.settlementService.listVoucherDrafts()
        })
      );
    }

    if (request.method === "POST" && url.pathname === "/settlement/payment-callbacks") {
      return this.handleSettlementWrite(request, "settlement.payment_callback", async () =>
        this.settlementService.recordPaymentCallback(
          await readJson<SettlementPaymentCallbackInput>(request)
        )
      );
    }

    if (request.method === "GET" && url.pathname === "/reports/store-sales-daily") {
      return this.handleRoleProtected(request, ["admin"], async () =>
        jsonResponse(200, {
          items: this.reportingService.getStoreSalesDailyReport()
        })
      );
    }

    if (request.method === "GET" && url.pathname === "/reports/inventory-daily") {
      return this.handleRoleProtected(request, ["admin"], async () =>
        jsonResponse(200, {
          items: this.reportingService.getInventoryDailyReport()
        })
      );
    }

    if (request.method === "GET" && url.pathname === "/reports/day-close-exceptions") {
      return this.handleRoleProtected(request, ["admin"], async () =>
        jsonResponse(200, {
          items: this.reportingService.getDayCloseExceptionReport()
        })
      );
    }

    return jsonResponse(404, {
      error: "not_found"
    });
  }

  private async handleRoleProtected(
    request: Request,
    allowedRoles: UserRole[],
    handler: (session: AuthSession) => Promise<Response>
  ): Promise<Response> {
    const token = readBearerToken(request);
    const authResult = this.authService.resolveSession(token);
    const decision = this.rbacService.requireRole(authResult, allowedRoles);

    if (!decision.allowed) {
      const errorCode = decision.reason ?? "forbidden";
      this.metricsService.recordApiError(errorCode);
      return jsonResponse(
        errorCode === "missing_token" || errorCode === "invalid_token" ? 401 : 403,
        {
          error: errorCode
        }
      );
    }

    if (authResult.status !== "valid") {
      return jsonResponse(500, {
        error: "auth_state_mismatch"
      });
    }

    return handler(authResult.session);
  }

  private async handleInventoryWrite(
    request: Request,
    action: string,
    execute: () => Promise<{ operationId: string; transactions: unknown[] }>
  ): Promise<Response> {
    return this.handleRoleProtected(request, ["admin"], async (session) => {
      try {
        const result = await execute();
        this.auditService.record({
          action,
          resource: "inventory",
          resourceId: result.operationId,
          actor: {
            id: session.id,
            username: session.username,
            role: session.role
          },
          after: result
        });

        return jsonResponse(201, result);
      } catch (error) {
        return inventoryErrorResponse(error, this.metricsService);
      }
    });
  }

  private async handlePosWrite(
    request: Request,
    action: string,
    execute: (session: AuthSession) => Promise<unknown> | unknown
  ): Promise<Response> {
    return this.handleRoleProtected(request, ["admin", "cashier"], async (session) => {
      try {
        const result = await execute(session);
        this.auditService.record({
          action,
          resource: "pos",
          resourceId: typeof result === "object" && result && "id" in result ? String(result.id) : action,
          actor: {
            id: session.id,
            username: session.username,
            role: session.role
          },
          after: result
        });

        return jsonResponse(201, result);
      } catch (error) {
        return posErrorResponse(error, this.metricsService);
      }
    });
  }

  private async handleOmniOrderWrite(
    request: Request,
    action: string,
    execute: () => Promise<unknown> | unknown
  ): Promise<Response> {
    return this.handleRoleProtected(request, ["admin"], async (session) => {
      try {
        const result = await execute();
        this.auditService.record({
          action,
          resource: "omni_order",
          resourceId:
            typeof result === "object" &&
            result &&
            "order" in result &&
            typeof result.order === "object" &&
            result.order &&
            "externalOrderId" in result.order
              ? String(result.order.externalOrderId)
              : typeof result === "object" && result && "externalOrderId" in result
                ? String(result.externalOrderId)
                : action,
          actor: {
            id: session.id,
            username: session.username,
            role: session.role
          },
          after: result
        });

        const status =
          typeof result === "object" && result && "created" in result && result.created === false ? 200 : 201;
        const body =
          typeof result === "object" && result && "order" in result && result.order ? result.order : result;

        return jsonResponse(status, body);
      } catch (error) {
        return omniOrderErrorResponse(error, this.metricsService);
      }
    });
  }

  private async handleSettlementWrite(
    request: Request,
    action: string,
    execute: () => Promise<unknown> | unknown
  ): Promise<Response> {
    return this.handleRoleProtected(request, ["admin"], async (session) => {
      try {
        const result = await execute();
        this.auditService.record({
          action,
          resource: "settlement",
          resourceId:
            typeof result === "object" && result && "id" in result ? String(result.id) : action,
          actor: {
            id: session.id,
            username: session.username,
            role: session.role
          },
          after: result
        });

        return jsonResponse(201, result);
      } catch (error) {
        return settlementErrorResponse(error, this.metricsService);
      }
    });
  }
}

export function createApp(options: CreateAppOptions = {}): RetailApiApp {
  const metricsService = options.metricsService ?? new MetricsService();
  const authService = options.authService ?? new AuthService();
  const rbacService = options.rbacService ?? new RbacService();
  const auditService = options.auditService ?? new AuditService();
  const masterDataService = options.masterDataService ?? new MasterDataService();
  const inventoryService =
    options.inventoryService ?? new InventoryService(masterDataService, metricsService);
  const posService =
    options.posService ?? new PosService(masterDataService, inventoryService, metricsService);
  const omniOrderService =
    options.omniOrderService ??
    new OmniOrderService(masterDataService, inventoryService, metricsService);
  const settlementService =
    options.settlementService ?? new SettlementService(posService, inventoryService, metricsService);
  const reportingService =
    options.reportingService ??
    new ReportingService(posService, inventoryService, settlementService);
  const healthService = options.healthService ?? new HealthService(metricsService);

  return new RetailApiApp(
    authService,
    rbacService,
    auditService,
    masterDataService,
    inventoryService,
    posService,
    omniOrderService,
    settlementService,
    reportingService,
    metricsService,
    healthService
  );
}
