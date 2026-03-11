import { once } from "node:events";
import type { IncomingHttpHeaders } from "node:http";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";

import { expect, request as playwrightRequest, test, type APIRequestContext } from "@playwright/test";
import { createApp } from "../../services/api/dist/src/app.js";

interface RunningApi {
  api: APIRequestContext;
  server: Server;
}

function normalizeHeaders(headers: IncomingHttpHeaders): Record<string, string> {
  return Object.entries(headers).reduce<Record<string, string>>((result, [key, value]) => {
    if (typeof value === "string") {
      result[key] = value;
    } else if (Array.isArray(value)) {
      result[key] = value.join(", ");
    }

    return result;
  }, {});
}

async function startApi(): Promise<RunningApi> {
  const app = createApp();
  const server = createServer(async (incoming, outgoing) => {
    const chunks: Buffer[] = [];
    for await (const chunk of incoming) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    const address = server.address();
    if (!address || typeof address === "string") {
      outgoing.statusCode = 500;
      outgoing.end("server_address_unavailable");
      return;
    }

    const body = Buffer.concat(chunks);
    const request = new Request(`http://127.0.0.1:${address.port}${incoming.url ?? "/"}`, {
      method: incoming.method,
      headers: normalizeHeaders(incoming.headers),
      body:
        body.length > 0 && incoming.method !== "GET" && incoming.method !== "HEAD" ? body : undefined
    });

    const response = await app.handle(request);
    outgoing.statusCode = response.status;
    response.headers.forEach((value, key) => {
      outgoing.setHeader(key, value);
    });
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  });

  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  const address = server.address() as AddressInfo;
  return {
    server,
    api: await playwrightRequest.newContext({
      baseURL: `http://127.0.0.1:${address.port}`
    })
  };
}

async function stopApi(runningApi: RunningApi): Promise<void> {
  await runningApi.api.dispose();
  await new Promise<void>((resolve, reject) => {
    runningApi.server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

async function loginAsAdmin(api: APIRequestContext): Promise<string> {
  const response = await api.post("/auth/login", {
    data: {
      username: "admin",
      password: "admin-pass"
    }
  });

  expect(response.status()).toBe(200);
  const body = (await response.json()) as { token: string };
  return body.token;
}

function authHeaders(token: string): Record<string, string> {
  return {
    authorization: `Bearer ${token}`
  };
}

async function postJson(
  api: APIRequestContext,
  path: string,
  token: string,
  data: Record<string, unknown>
) {
  return api.post(path, {
    headers: authHeaders(token),
    data
  });
}

async function seedStore(api: APIRequestContext, token: string): Promise<void> {
  const response = await postJson(api, "/master-data/stores", token, {
    id: "store-001",
    code: "SH001",
    name: "Shanghai Flagship Store"
  });

  expect(response.status()).toBe(201);
}

async function seedWarehouse(
  api: APIRequestContext,
  token: string,
  input: { id: string; code: string; name: string; type: "store" | "central"; storeId: string }
): Promise<void> {
  const response = await postJson(api, "/master-data/warehouses", token, input);
  expect(response.status()).toBe(201);
}

async function seedSku(
  api: APIRequestContext,
  token: string,
  input: { id: string; skuCode: string; barcode: string; name: string }
): Promise<void> {
  const response = await postJson(api, "/master-data/skus", token, input);
  expect(response.status()).toBe(201);
}

async function seedBaseMasterData(api: APIRequestContext, token: string): Promise<void> {
  await seedStore(api, token);
  await seedWarehouse(api, token, {
    id: "wh-001",
    code: "WH-SH-01",
    name: "Shanghai Main Warehouse",
    type: "store",
    storeId: "store-001"
  });
  await seedWarehouse(api, token, {
    id: "wh-002",
    code: "WH-SH-02",
    name: "Shanghai Backup Warehouse",
    type: "store",
    storeId: "store-001"
  });
  await seedSku(api, token, {
    id: "sku-001",
    skuCode: "SKU-APPLE-001",
    barcode: "6901234567890",
    name: "Apple Juice 1L"
  });
}

async function getBalance(
  api: APIRequestContext,
  token: string,
  warehouseId: string,
  skuId: string,
  stockStatus: string
): Promise<number> {
  const response = await api.get(`/inventory/balances?warehouseId=${warehouseId}&skuId=${skuId}`, {
    headers: authHeaders(token)
  });

  expect(response.status()).toBe(200);
  const body = (await response.json()) as {
    items: Array<{ stockStatus: string; quantity: number }>;
  };

  return body.items.find((item) => item.stockStatus === stockStatus)?.quantity ?? 0;
}

function metricValue(
  metricsText: string,
  metricName: string,
  labels: Record<string, string> = {}
): number | null {
  const selector =
    Object.keys(labels).length === 0
      ? metricName
      : `${metricName}{${Object.entries(labels)
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([key, value]) => `${key}="${value}"`)
          .join(",")}}`;
  const line = metricsText
    .split("\n")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${selector} `));

  if (!line) {
    return null;
  }

  return Number(line.slice(selector.length + 1));
}

test("purchase receipt flow updates stock and exposes health plus metrics", async () => {
  const runningApi = await startApi();

  try {
    const token = await loginAsAdmin(runningApi.api);
    await seedBaseMasterData(runningApi.api, token);

    const inboundResponse = await postJson(runningApi.api, "/inventory/inbounds", token, {
      warehouseId: "wh-001",
      skuId: "sku-001",
      quantity: 20
    });

    expect(inboundResponse.status()).toBe(201);
    expect(await getBalance(runningApi.api, token, "wh-001", "sku-001", "available")).toBe(20);

    const liveResponse = await runningApi.api.get("/health/live");
    expect(liveResponse.status()).toBe(200);

    const readyResponse = await runningApi.api.get("/health/ready");
    expect(readyResponse.status()).toBe(200);

    const metricsResponse = await runningApi.api.get("/metrics");
    expect(metricsResponse.status()).toBe(200);
    const metricsText = await metricsResponse.text();

    expect(metricValue(metricsText, "retail_inventory_operations_total", { operation_type: "inbound" })).toBe(1);
    expect(metricValue(metricsText, "retail_health_status", { check: "live" })).toBe(1);
    expect(metricValue(metricsText, "retail_health_status", { check: "ready" })).toBe(1);
  } finally {
    await stopApi(runningApi);
  }
});

test("inventory transfer flow lands stock in destination warehouse and records transfer counter", async () => {
  const runningApi = await startApi();

  try {
    const token = await loginAsAdmin(runningApi.api);
    await seedBaseMasterData(runningApi.api, token);

    const inboundResponse = await postJson(runningApi.api, "/inventory/inbounds", token, {
      warehouseId: "wh-001",
      skuId: "sku-001",
      quantity: 12
    });
    expect(inboundResponse.status()).toBe(201);

    const transferResponse = await postJson(runningApi.api, "/inventory/transfers", token, {
      fromWarehouseId: "wh-001",
      toWarehouseId: "wh-002",
      skuId: "sku-001",
      quantity: 5
    });
    expect(transferResponse.status()).toBe(201);

    expect(await getBalance(runningApi.api, token, "wh-001", "sku-001", "available")).toBe(7);
    expect(await getBalance(runningApi.api, token, "wh-002", "sku-001", "available")).toBe(5);

    const metricsText = await (await runningApi.api.get("/metrics")).text();
    expect(metricValue(metricsText, "retail_inventory_operations_total", { operation_type: "transfer" })).toBe(1);
  } finally {
    await stopApi(runningApi);
  }
});

test("pos sale and day-close flow produces balanced close counters", async () => {
  const runningApi = await startApi();

  try {
    const token = await loginAsAdmin(runningApi.api);
    await seedBaseMasterData(runningApi.api, token);

    const inboundResponse = await postJson(runningApi.api, "/inventory/inbounds", token, {
      warehouseId: "wh-001",
      skuId: "sku-001",
      quantity: 20
    });
    expect(inboundResponse.status()).toBe(201);

    const openShiftResponse = await postJson(runningApi.api, "/pos/shifts/open", token, {
      shiftId: "shift-001",
      storeId: "store-001",
      openingCash: 100
    });
    expect(openShiftResponse.status()).toBe(201);

    const saleResponse = await postJson(runningApi.api, "/pos/orders/sales", token, {
      orderId: "sale-001",
      shiftId: "shift-001",
      storeId: "store-001",
      warehouseId: "wh-001",
      lines: [{ skuId: "sku-001", quantity: 2, unitPrice: 12 }],
      payments: [{ method: "cash", amount: 24 }],
      paymentStatus: "success"
    });
    expect(saleResponse.status()).toBe(201);

    const closeShiftResponse = await postJson(runningApi.api, "/pos/shifts/close", token, {
      shiftId: "shift-001",
      closingCash: 124
    });
    expect(closeShiftResponse.status()).toBe(201);

    const dayCloseResponse = await postJson(runningApi.api, "/pos/day-close", token, {
      shiftId: "shift-001",
      countedCash: 124,
      countedThirdPartyTotal: 0
    });
    expect(dayCloseResponse.status()).toBe(201);

    const dayCloseBody = (await dayCloseResponse.json()) as { status: string };
    expect(dayCloseBody.status).toBe("balanced");

    const metricsText = await (await runningApi.api.get("/metrics")).text();
    expect(metricValue(metricsText, "retail_pos_orders_total", { order_type: "sale", status: "paid" })).toBe(1);
    expect(metricValue(metricsText, "retail_pos_shift_events_total", { event: "day_close", status: "balanced" })).toBe(1);
  } finally {
    await stopApi(runningApi);
  }
});

test("omnichannel fulfillment retry exposes reservation failure and recovery metrics", async () => {
  const runningApi = await startApi();

  try {
    const token = await loginAsAdmin(runningApi.api);
    await seedBaseMasterData(runningApi.api, token);

    const firstSyncResponse = await postJson(
      runningApi.api,
      "/omni-orders/sync/mock-marketplace",
      token,
      {
        externalOrderId: "ext-001",
        channel: "mock-marketplace",
        lines: [{ skuId: "sku-001", quantity: 2 }],
        candidateWarehouseIds: ["wh-001"],
        rawPayload: {
          orderNo: "ext-001"
        }
      }
    );
    expect(firstSyncResponse.status()).toBe(201);
    const firstSyncBody = (await firstSyncResponse.json()) as { status: string };
    expect(firstSyncBody.status).toBe("reservation_failed");

    const inboundResponse = await postJson(runningApi.api, "/inventory/inbounds", token, {
      warehouseId: "wh-001",
      skuId: "sku-001",
      quantity: 3
    });
    expect(inboundResponse.status()).toBe(201);

    const retryResponse = await postJson(runningApi.api, "/omni-orders/retry", token, {
      externalOrderId: "ext-001"
    });
    expect(retryResponse.status()).toBe(201);
    const retryBody = (await retryResponse.json()) as { status: string; fulfillmentWarehouseId: string | null };
    expect(retryBody.status).toBe("reserved");
    expect(retryBody.fulfillmentWarehouseId).toBe("wh-001");

    expect(await getBalance(runningApi.api, token, "wh-001", "sku-001", "available")).toBe(1);
    expect(await getBalance(runningApi.api, token, "wh-001", "sku-001", "reserved")).toBe(2);

    const metricsText = await (await runningApi.api.get("/metrics")).text();
    expect(
      metricValue(metricsText, "retail_omni_order_sync_total", {
        channel: "mock-marketplace",
        status: "reservation_failed"
      })
    ).toBe(1);
    expect(
      metricValue(metricsText, "retail_omni_order_retry_total", {
        channel: "mock-marketplace",
        status: "reserved"
      })
    ).toBe(1);
    expect(
      metricValue(metricsText, "retail_integration_failures_total", {
        channel: "mock-marketplace",
        reason: "insufficient_inventory"
      })
    ).toBe(1);
  } finally {
    await stopApi(runningApi);
  }
});
