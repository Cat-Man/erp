import assert from "node:assert/strict";
import test from "node:test";

import { createApp } from "../src/app.js";

async function loginAs(username: string, password: string): Promise<string> {
  const app = createApp();
  const response = await app.handle(
    new Request("http://localhost/auth/login", {
      method: "POST",
      body: JSON.stringify({
        username,
        password
      })
    })
  );
  const body = (await response.json()) as { token: string };
  return body.token;
}

test("admin endpoint rejects requests without token", async () => {
  const app = createApp();
  const response = await app.handle(new Request("http://localhost/admin/ping"));

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), {
    error: "missing_token"
  });
});

test("admin endpoint rejects forged token", async () => {
  const app = createApp();
  const forgedToken = Buffer.from(
    JSON.stringify({
      id: "u-attacker",
      username: "attacker",
      displayName: "Forged Admin",
      role: "admin"
    }),
    "utf8"
  ).toString("base64url");

  const response = await app.handle(
    new Request("http://localhost/admin/ping", {
      headers: {
        authorization: `Bearer ${forgedToken}`
      }
    })
  );

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), {
    error: "invalid_token"
  });
});

test("admin endpoint rejects cashier token", async () => {
  const app = createApp();
  const loginResponse = await app.handle(
    new Request("http://localhost/auth/login", {
      method: "POST",
      body: JSON.stringify({
        username: "cashier",
        password: "cashier-pass"
      })
    })
  );
  const loginBody = (await loginResponse.json()) as { token: string };

  const response = await app.handle(
    new Request("http://localhost/admin/ping", {
      headers: {
        authorization: `Bearer ${loginBody.token}`
      }
    })
  );

  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), {
    error: "insufficient_role"
  });
});

test("protected write creates an audit log entry", async () => {
  const app = createApp();
  const loginResponse = await app.handle(
    new Request("http://localhost/auth/login", {
      method: "POST",
      body: JSON.stringify({
        username: "admin",
        password: "admin-pass"
      })
    })
  );
  const loginBody = (await loginResponse.json()) as { token: string };

  const createResponse = await app.handle(
    new Request("http://localhost/stores", {
      method: "POST",
      headers: {
        authorization: `Bearer ${loginBody.token}`
      },
      body: JSON.stringify({
        storeId: "store-001",
        name: "Nanjing Road Store"
      })
    })
  );

  assert.equal(createResponse.status, 201);

  const auditResponse = await app.handle(
    new Request("http://localhost/audit-logs", {
      headers: {
        authorization: `Bearer ${loginBody.token}`
      }
    })
  );

  assert.equal(auditResponse.status, 200);

  const auditBody = (await auditResponse.json()) as {
    entries: Array<{
      action: string;
      resource: string;
      resourceId: string;
      actor: { username: string; role: string };
    }>;
  };

  assert.equal(auditBody.entries.length, 1);
  assert.equal(auditBody.entries[0]?.action, "store.create");
  assert.equal(auditBody.entries[0]?.resource, "store");
  assert.equal(auditBody.entries[0]?.resourceId, "store-001");
  assert.equal(auditBody.entries[0]?.actor.username, "admin");
  assert.equal(auditBody.entries[0]?.actor.role, "admin");
});
