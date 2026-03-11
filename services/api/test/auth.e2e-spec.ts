import assert from "node:assert/strict";
import test from "node:test";

import { createApp } from "../src/app.js";

test("login succeeds with valid credentials", async () => {
  const app = createApp();

  const response = await app.handle(
    new Request("http://localhost/auth/login", {
      method: "POST",
      body: JSON.stringify({
        username: "admin",
        password: "admin-pass"
      })
    })
  );

  assert.equal(response.status, 200);

  const body = (await response.json()) as {
    token: string;
    user: { username: string; role: string };
  };

  assert.ok(body.token);
  assert.equal(body.user.username, "admin");
  assert.equal(body.user.role, "admin");
});

test("login fails with invalid credentials", async () => {
  const app = createApp();

  const response = await app.handle(
    new Request("http://localhost/auth/login", {
      method: "POST",
      body: JSON.stringify({
        username: "admin",
        password: "wrong-pass"
      })
    })
  );

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), {
    error: "invalid_credentials"
  });
});
