# 门店日结支持 Runbook

## 1. 目标

本手册用于处理门店日结、对账差异和第三方回单延迟。当前 MVP 为内存版实现，生产化落地时应将同样流程映射到持久化日志和告警平台。

## 2. 先看什么

优先检查以下信息：

- 门店 / 班次编号
- 当班销售、退款、换货流水
- 最近一次日结记录
- 最近一次对账结果
- `/metrics` 中的：
  - `retail_pos_shift_events_total`
  - `retail_settlement_reconciliations_total`
  - `retail_api_errors_total`

## 3. 标准排查顺序

1. 确认班次是否已执行 `POST /pos/shifts/close`
2. 确认是否已执行 `POST /pos/day-close`
3. 查看 `GET /reports/day-close-exceptions` 是否出现异常记录
4. 查看 `POST /settlement/reconciliations` 返回的 `status`
5. 若为第三方回单延迟，补录 `POST /settlement/payment-callbacks` 后重新对账

## 4. 常见场景

### 4.1 日结状态为 `exception`

现象：

- `POST /pos/day-close` 成功，但后续对账结果为 `exception`
- `retail_settlement_reconciliations_total{status="exception"}` 增长

处理：

1. 取班次的 `expectedCash`、`countedCash`
2. 取班次的 `expectedThirdPartyTotal`、`countedThirdPartyTotal`
3. 判断差异是现金实收不符，还是第三方回单未到
4. 现金差异需门店主管复核后再决定是否重新盘点或人工确认

### 4.2 第三方回单延迟

现象：

- 现金一致，但第三方金额少于 `expectedThirdPartyTotal`
- 支付渠道回单晚到

处理：

1. 收集支付渠道流水号
2. 调用 `POST /settlement/payment-callbacks`
3. 重新调用 `POST /settlement/reconciliations`
4. 确认对账状态由 `exception` 转为 `balanced`

### 4.3 未完成交接班就做日结

现象：

- 日结返回 `pos_shift_not_closed`

处理：

1. 先执行 `POST /pos/shifts/close`
2. 再执行 `POST /pos/day-close`
3. 若仍失败，检查班次状态是否重复关闭或班次号是否错误

## 5. 升级条件

出现以下情况应升级到研发支持：

- 同一班次重复对账后仍持续 `exception`
- `retail_api_errors_total` 持续增长且错误码无法由业务操作解释
- 日结异常影响多个门店或多个支付方式
- 订单、库存、日结口径之间出现无法解释的串账

## 6. 处理完成后的收尾

- 记录班次号、门店、异常原因、处理动作、处理人、完成时间
- 更新异常台账，确认是否需要补充自动化用例
- 若属于规则不清晰，回到需求文档补齐业务口径后再继续扩展开发
