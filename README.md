# 零售 ERP MVP

一个面向零售行业的 ERP MVP 单仓库项目，当前聚焦于门店基础运营的核心闭环：主数据、库存、POS、单渠道全渠道订单、日结对账、报表，以及发布和运维所需的健康检查、指标和 Runbook。

## 当前范围

当前仓库已经实现并通过自动化验证的能力包括：

- 认证、RBAC、审计日志
- 主数据管理：门店、仓库、SKU、价格
- 库存：入库、出库、调拨、预留、释放、盘点调整
- POS：销售、退款、换货、交接班、日结
- 全渠道：`mock-marketplace` 订单同步、占库失败重试、履约仓分配
- 结算与报表：对账、待审核凭证草稿、销售日报、库存日报、日结异常报表
- 可观测性：`/health/live`、`/health/ready`、`/metrics`
- 运行手册：发布检查、日结支持

## 技术栈

- `TypeScript`
- `pnpm workspace`
- `tsx`
- `Playwright`
- 当前实现为轻量内存版业务内核，便于先打通业务链路和测试

## 仓库结构

```text
apps/
  admin-web/      运营后台页面元数据
  pos-web/        POS 页面状态与测试
services/
  api/            业务 API 核心实现
packages/
  contracts/      接口契约
  db/             Schema / 校验定义
  domain/         领域枚举与辅助逻辑
docs/
  plans/          实施计划
  runbooks/       发布与运维手册
tests/
  e2e/            核心业务 E2E
```

## 快速开始

### 1. 安装依赖

```bash
corepack enable
corepack pnpm install
```

### 2. 常用命令

```bash
corepack pnpm test
corepack pnpm test:e2e
corepack pnpm lint
corepack pnpm build
```

## 核心验证链路

`tests/e2e/retail-core.spec.ts` 当前覆盖 4 条 P0 链路：

1. 采购入库
2. 库存调拨
3. POS 销售与日结
4. 全渠道订单占库失败后补货重试

## 健康检查与指标

当前 API 暴露以下运维入口：

- `GET /health/live`
- `GET /health/ready`
- `GET /metrics`

`/metrics` 采用 Prometheus 文本格式，已覆盖库存操作、POS 订单、班次事件、全渠道同步/重试、结算结果、API 错误等指标。

## 文档索引

- 需求文档：`ERP系统需求文档.md`
- 开发就绪分析：`docs/retail-erp-dev-readiness-package.md`
- MVP 实施计划：`docs/plans/2026-03-10-retail-erp-mvp-implementation.md`
- 发布检查清单：`docs/runbooks/release-checklist.md`
- 门店日结支持：`docs/runbooks/day-close-support.md`

## 当前限制

这个仓库现在还不是完整生产版系统，主要限制如下：

- 业务数据为内存态，不含真实数据库和消息队列
- `admin-web`、`pos-web` 仍以页面元数据 / 状态为主，不是完整 UI
- 外部平台当前仅内置 `mock-marketplace`
- 更复杂的促销、会员、自动凭证过账、智能补货等能力尚未纳入

## 发布建议

提交发布前，至少执行：

```bash
corepack pnpm test
corepack pnpm test:e2e
corepack pnpm lint
corepack pnpm build
```

详细检查项见 `docs/runbooks/release-checklist.md`。
