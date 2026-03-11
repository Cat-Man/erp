# 零售 ERP MVP 发布检查清单

## 1. 适用范围

本清单适用于当前仓库的零售 ERP MVP。当前实现仍是内存版业务内核，发布门禁以构建、自动化测试、E2E 链路和健康指标检查为准。

## 2. 发布前门禁

- 范围冻结：仅发布已纳入 MVP 的基础资料、库存、POS、全渠道订单、日结对账与报表能力。
- 变更确认：确认本次发布未引入新的外部平台、支付方式或库存口径。
- 数据准备：门店、仓库、SKU、价格、角色权限已完成初始化。
- 风险确认：已明确是否存在需要人工关注的日结异常、库存差异、对账差异。

## 3. 必跑自动化检查

按顺序执行以下命令，任一失败即停止发布：

```bash
corepack pnpm test
corepack pnpm test:e2e
corepack pnpm lint
corepack pnpm build
```

## 4. UAT 核心链路

以下四条链路必须在发布候选版本上完成验证：

| 链路 | 自动化覆盖 | 通过标准 |
| --- | --- | --- |
| 采购入库 | `tests/e2e/retail-core.spec.ts` | 入库后可售库存增加，`/health/live`、`/health/ready`、`/metrics` 可访问 |
| 库存调拨 | `tests/e2e/retail-core.spec.ts` | 调出仓减少、调入仓增加，存在 `retail_inventory_operations_total{operation_type="transfer"}` |
| POS 销售 / 日结 | `tests/e2e/retail-core.spec.ts` | 销售后库存扣减，日结状态正确，存在 `retail_pos_orders_total` 与 `retail_pos_shift_events_total` |
| 全渠道履约重试 | `tests/e2e/retail-core.spec.ts` | 首次占库失败后补货重试成功，存在 `retail_omni_order_sync_total`、`retail_omni_order_retry_total`、`retail_integration_failures_total` |

## 5. 观测性检查

部署后必须确认：

- `GET /health/live` 返回 `200`，`status=live`
- `GET /health/ready` 返回 `200`，`status=ready`
- `GET /metrics` 返回 Prometheus 文本格式
- 指标中至少包含以下序列：
  - `retail_health_status`
  - `retail_inventory_operations_total`
  - `retail_pos_orders_total`
  - `retail_pos_shift_events_total`
  - `retail_omni_order_sync_total`
  - `retail_integration_failures_total`
  - `retail_settlement_reconciliations_total`
  - `retail_api_errors_total`

## 6. 发布步骤

1. 执行第 3 节全部命令并归档输出。
2. 在目标环境部署 API 承载层与当前构建产物。
3. 完成一次发布后冒烟：
   - 登录成功
   - 访问 `/health/live`
   - 访问 `/health/ready`
   - 访问 `/metrics`
4. 由业务方确认门店基础资料、库存余额、POS 班次入口可用。
5. 观察首批真实或演练交易，确认关键指标开始增长且无异常错误码激增。

## 7. 回滚触发条件

出现以下任一情况应立即回滚：

- `/health/ready` 非 `200`
- `corepack pnpm test:e2e` 对应的四条核心链路出现回归
- `retail_api_errors_total` 在发布后短时间内持续增长
- POS 日结或全渠道订单履约出现阻塞，且 15 分钟内无法恢复

## 8. 回滚步骤

1. 停止继续放量或暂停门店/渠道新流量切换。
2. 回退到上一个稳定构建产物。
3. 重新执行健康检查与核心冒烟。
4. 记录故障时间、影响范围、错误码、指标快照。
5. 将问题转入缺陷修复，未完成复盘前不得再次发布同类变更。
