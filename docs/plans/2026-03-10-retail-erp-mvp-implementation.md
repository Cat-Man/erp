# Retail ERP MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a first deployable retail ERP MVP that covers store operations, inventory, one-channel omnichannel order sync, day-close reconciliation, RBAC, and auditability.

**Architecture:** Assume a greenfield monorepo. Use a domain-first split with one backend API service, one operations/admin web app, one POS web app, and shared packages for contracts, database schema, and domain enums. Keep V1 narrow: stable transaction processing first, analytics and advanced pricing/promotion rules later.

**Tech Stack:** TypeScript, React, Vite, NestJS, PostgreSQL, Redis, pnpm workspace, Playwright, Vitest, Prisma or equivalent ORM.

## Assumptions

- This repo will be initialized as a new monorepo.
- The first external platform is exactly one e-commerce platform and one payment stack.
- POS is online-only in V1.
- Voucher generation is review-first, not fully auto-posted.

### Task 1: Bootstrap the repository and engineering guardrails

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `.editorconfig`
- Create: `.gitignore`
- Create: `apps/admin-web/package.json`
- Create: `apps/pos-web/package.json`
- Create: `services/api/package.json`
- Create: `packages/contracts/package.json`
- Create: `packages/domain/package.json`
- Create: `packages/db/package.json`
- Create: `.github/workflows/ci.yml`

**Step 1: Initialize the workspace metadata**

Create the root workspace files with scripts for `lint`, `test`, `build`, and `dev`.

**Step 2: Add a failing CI smoke test**

Create a minimal CI workflow that runs install, lint, test, and build.

**Step 3: Create minimal app and package scaffolds**

Add empty entrypoints for `admin-web`, `pos-web`, `api`, `contracts`, `domain`, and `db`.

**Step 4: Run workspace checks**

Run: `pnpm install && pnpm lint && pnpm test && pnpm build`
Expected: all commands run successfully on the empty scaffold.

**Step 5: Commit**

Use a commit like:

```bash
git add .
git commit -m "chore: bootstrap retail erp monorepo"
```

### Task 2: Establish authentication, RBAC, and audit logging

**Files:**
- Create: `services/api/src/modules/auth/*`
- Create: `services/api/src/modules/rbac/*`
- Create: `services/api/src/modules/audit/*`
- Create: `packages/contracts/src/auth.ts`
- Create: `packages/contracts/src/rbac.ts`
- Create: `packages/contracts/src/audit.ts`
- Create: `services/api/test/auth.e2e-spec.ts`
- Create: `services/api/test/rbac.e2e-spec.ts`

**Step 1: Write failing tests for login and role checks**

Cover login success, login failure, role-protected endpoints, and audit log generation for protected writes.

**Step 2: Run the tests and confirm they fail**

Run: `pnpm --filter api test auth.e2e-spec.ts rbac.e2e-spec.ts`
Expected: module/controller/service not found or route not implemented.

**Step 3: Implement minimal auth and role middleware**

Add login endpoint, JWT/session handling, role guard, and audit interceptor.

**Step 4: Re-run targeted tests**

Run: `pnpm --filter api test auth.e2e-spec.ts rbac.e2e-spec.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add services/api packages/contracts
git commit -m "feat: add auth rbac and audit foundation"
```

### Task 3: Implement master data for organization, store, warehouse, SKU, and price

**Files:**
- Create: `packages/db/src/schema/org.ts`
- Create: `packages/db/src/schema/store.ts`
- Create: `packages/db/src/schema/warehouse.ts`
- Create: `packages/db/src/schema/sku.ts`
- Create: `packages/db/src/schema/price.ts`
- Create: `services/api/src/modules/master-data/*`
- Create: `apps/admin-web/src/pages/master-data/*`
- Create: `services/api/test/master-data.e2e-spec.ts`

**Step 1: Write failing API tests for CRUD and validation**

Cover store create, warehouse create, SKU create, duplicate barcode rejection, and price overlap rejection.

**Step 2: Run the tests and verify they fail**

Run: `pnpm --filter api test master-data.e2e-spec.ts`
Expected: schema/table/service missing.

**Step 3: Implement schema, service, and API endpoints**

Add core tables, validation rules, and admin CRUD endpoints.

**Step 4: Add admin web screens for list and detail management**

Implement basic list/detail/edit flows for stores, warehouses, SKUs, and prices.

**Step 5: Re-run tests**

Run: `pnpm --filter api test master-data.e2e-spec.ts`
Expected: PASS.

**Step 6: Commit**

```bash
git add packages/db services/api apps/admin-web
git commit -m "feat: add master data management"
```

### Task 4: Build the inventory ledger, balance, reservation, and transfer flows

**Files:**
- Create: `packages/db/src/schema/inventory.ts`
- Create: `packages/domain/src/inventory.ts`
- Create: `services/api/src/modules/inventory/*`
- Create: `apps/admin-web/src/pages/inventory/*`
- Create: `services/api/test/inventory.e2e-spec.ts`

**Step 1: Write failing tests for balance and ledger behavior**

Cover inbound, outbound, transfer, reserve, release, and count adjustment flows.

**Step 2: Run the tests and confirm they fail**

Run: `pnpm --filter api test inventory.e2e-spec.ts`
Expected: inventory service/routes absent.

**Step 3: Implement ledger-first inventory logic**

Ensure every balance update writes a matching inventory transaction record.

**Step 4: Add admin web inventory pages**

Create screens for balance query, transfer creation, and count difference review.

**Step 5: Re-run targeted tests**

Run: `pnpm --filter api test inventory.e2e-spec.ts`
Expected: PASS.

**Step 6: Commit**

```bash
git add packages/db packages/domain services/api apps/admin-web
git commit -m "feat: add inventory ledger and transfer flows"
```

### Task 5: Implement the POS order, return, exchange, shift, and day-close flow

**Files:**
- Create: `packages/db/src/schema/pos.ts`
- Create: `packages/contracts/src/pos.ts`
- Create: `services/api/src/modules/pos/*`
- Create: `apps/pos-web/src/pages/checkout/*`
- Create: `apps/pos-web/src/pages/day-close/*`
- Create: `services/api/test/pos.e2e-spec.ts`
- Create: `apps/pos-web/src/__tests__/checkout.test.tsx`

**Step 1: Write failing backend tests for POS order lifecycle**

Cover sale, refund, exchange, payment success, payment failure, and inventory deduction timing.

**Step 2: Write failing frontend tests for cashier interactions**

Cover SKU scan, member attach, price render, payment completion, and return entry.

**Step 3: Run tests to confirm both suites fail**

Run: `pnpm --filter api test pos.e2e-spec.ts`
Run: `pnpm --filter pos-web test checkout.test.tsx`
Expected: FAIL.

**Step 4: Implement minimal POS backend and web checkout flow**

Build the smallest usable transaction loop before styling or optimization.

**Step 5: Implement shift handoff and day-close**

Add opening shift, closing shift, cash count capture, third-party payment totals, and exception states.

**Step 6: Re-run tests**

Expected: PASS for backend and frontend suites.

**Step 7: Commit**

```bash
git add packages/db packages/contracts services/api apps/pos-web
git commit -m "feat: add pos and day close flow"
```

### Task 6: Add one-channel omnichannel order sync and fulfillment allocation

**Files:**
- Create: `services/api/src/modules/omni-order/*`
- Create: `services/api/src/modules/integrations/<platform>/*`
- Create: `packages/contracts/src/omni-order.ts`
- Create: `apps/admin-web/src/pages/orders/*`
- Create: `services/api/test/omni-order.e2e-spec.ts`

**Step 1: Write failing tests for order ingest and stock reservation**

Cover order sync, idempotent re-sync, reserve success, reserve failure, and fulfillment node assignment.

**Step 2: Run the tests and verify they fail**

Run: `pnpm --filter api test omni-order.e2e-spec.ts`
Expected: FAIL.

**Step 3: Implement platform adapter and order service**

Persist platform raw payloads, normalize into internal order structure, and reserve stock.

**Step 4: Add order operations screens**

Create list/detail/retry views for operations users.

**Step 5: Re-run targeted tests**

Expected: PASS.

**Step 6: Commit**

```bash
git add services/api packages/contracts apps/admin-web
git commit -m "feat: add one-channel omnichannel order sync"
```

### Task 7: Implement reconciliation, voucher staging, and operational reports

**Files:**
- Create: `packages/db/src/schema/settlement.ts`
- Create: `services/api/src/modules/settlement/*`
- Create: `services/api/src/modules/reporting/*`
- Create: `apps/admin-web/src/pages/settlement/*`
- Create: `apps/admin-web/src/pages/reports/*`
- Create: `services/api/test/settlement.e2e-spec.ts`

**Step 1: Write failing tests for day-close reconciliation**

Cover successful close, payment mismatch, delayed callback handling, and voucher draft generation.

**Step 2: Run the tests and confirm they fail**

Run: `pnpm --filter api test settlement.e2e-spec.ts`
Expected: FAIL.

**Step 3: Implement reconciliation services and voucher draft generation**

Do not auto-post. Store reviewable voucher stubs only.

**Step 4: Add daily operational reports**

Ship store sales daily report, inventory daily report, and day-close exception report.

**Step 5: Re-run tests**

Expected: PASS.

**Step 6: Commit**

```bash
git add packages/db services/api apps/admin-web
git commit -m "feat: add settlement and reporting"
```

### Task 8: Add observability, release readiness, and UAT coverage

**Files:**
- Create: `services/api/src/modules/health/*`
- Create: `services/api/src/modules/metrics/*`
- Create: `tests/e2e/retail-core.spec.ts`
- Create: `docs/runbooks/release-checklist.md`
- Create: `docs/runbooks/day-close-support.md`

**Step 1: Write failing end-to-end tests for the four critical flows**

Cover purchase receipt, inventory transfer, POS sale/day-close, and omnichannel order fulfillment.

**Step 2: Run the tests and confirm they fail**

Run: `pnpm test:e2e`
Expected: FAIL.

**Step 3: Add health checks, metrics, and error tracing hooks**

Expose readiness, liveness, core transaction counters, and queue/integration failure metrics.

**Step 4: Add runbooks**

Document release, rollback, payment mismatch handling, and day-close support procedures.

**Step 5: Re-run end-to-end tests**

Run: `pnpm test:e2e`
Expected: PASS.

**Step 6: Commit**

```bash
git add services/api tests/e2e docs/runbooks
git commit -m "chore: add release readiness and core e2e coverage"
```

## Exit Criteria

- The system supports one live store pilot and one e-commerce channel.
- All P0 APIs are covered by contract or e2e tests.
- Inventory updates are ledger-backed and auditable.
- POS day-close can reconcile and raise exceptions.
- External integrations are idempotent and retry-safe.
- Release, rollback, and support runbooks exist.

