const metricDefinitions = {
  retail_api_errors_total: {
    type: "counter",
    help: "Total number of API error responses by error code."
  },
  retail_api_uptime_seconds: {
    type: "gauge",
    help: "API process uptime in seconds."
  },
  retail_health_status: {
    type: "gauge",
    help: "Health endpoint status where 1 means healthy."
  },
  retail_integration_failures_total: {
    type: "counter",
    help: "Total number of integration failures by channel and reason."
  },
  retail_inventory_operations_total: {
    type: "counter",
    help: "Total number of successful inventory operations by type."
  },
  retail_omni_order_retry_total: {
    type: "counter",
    help: "Total number of omnichannel order reservation retries by channel and result."
  },
  retail_omni_order_sync_total: {
    type: "counter",
    help: "Total number of omnichannel order syncs by channel and result."
  },
  retail_pos_orders_total: {
    type: "counter",
    help: "Total number of POS orders by order type and status."
  },
  retail_pos_shift_events_total: {
    type: "counter",
    help: "Total number of POS shift events by event and outcome."
  },
  retail_settlement_reconciliations_total: {
    type: "counter",
    help: "Total number of settlement reconciliations by result."
  }
} as const;

type MetricDefinition = (typeof metricDefinitions)[keyof typeof metricDefinitions];
type MetricName = keyof typeof metricDefinitions;

interface MetricSeries {
  labels: Record<string, string>;
  value: number;
}

function normalizeLabels(labels: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(labels).sort(([left], [right]) => left.localeCompare(right))
  );
}

function buildSeriesKey(metricName: MetricName, labels: Record<string, string>): string {
  return `${metricName}::${JSON.stringify(normalizeLabels(labels))}`;
}

function formatLabels(labels: Record<string, string>): string {
  const entries = Object.entries(labels);
  if (entries.length === 0) {
    return "";
  }

  const labelText = entries
    .map(([key, value]) => `${key}="${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`)
    .join(",");
  return `{${labelText}}`;
}

export class MetricsService {
  private readonly startedAt = Date.now();
  private readonly counters = new Map<string, MetricSeries>();
  private readonly gauges = new Map<string, MetricSeries>();

  recordHealthCheck(check: "live" | "ready", value: 0 | 1): void {
    this.setGauge("retail_health_status", { check }, value);
  }

  recordInventoryOperation(operationType: string): void {
    this.incrementCounter("retail_inventory_operations_total", {
      operation_type: operationType
    });
  }

  recordPosOrder(orderType: string, status: string): void {
    this.incrementCounter("retail_pos_orders_total", {
      order_type: orderType,
      status
    });
  }

  recordPosShiftEvent(event: string, status: string): void {
    this.incrementCounter("retail_pos_shift_events_total", {
      event,
      status
    });
  }

  recordOmniOrderSync(channel: string, status: string): void {
    this.incrementCounter("retail_omni_order_sync_total", {
      channel,
      status
    });
  }

  recordOmniOrderRetry(channel: string, status: string): void {
    this.incrementCounter("retail_omni_order_retry_total", {
      channel,
      status
    });
  }

  recordIntegrationFailure(channel: string, reason: string): void {
    this.incrementCounter("retail_integration_failures_total", {
      channel,
      reason
    });
  }

  recordSettlementReconciliation(status: string): void {
    this.incrementCounter("retail_settlement_reconciliations_total", {
      status
    });
  }

  recordApiError(code: string): void {
    this.incrementCounter("retail_api_errors_total", {
      code
    });
  }

  scrape(): string {
    this.setGauge("retail_api_uptime_seconds", {}, Math.floor((Date.now() - this.startedAt) / 1000));

    const lines: string[] = [];

    for (const metricName of Object.keys(metricDefinitions).sort() as MetricName[]) {
      const definition = metricDefinitions[metricName];
      lines.push(`# HELP ${metricName} ${definition.help}`);
      lines.push(`# TYPE ${metricName} ${definition.type}`);

      const series = this.getSeriesForMetric(metricName, definition);
      if (series.length === 0 && definition.type === "gauge") {
        lines.push(`${metricName} 0`);
        continue;
      }

      for (const entry of series) {
        lines.push(`${metricName}${formatLabels(entry.labels)} ${entry.value}`);
      }
    }

    return `${lines.join("\n")}\n`;
  }

  private incrementCounter(
    metricName: Extract<MetricName, `${string}_total`>,
    labels: Record<string, string>,
    value = 1
  ): void {
    const normalizedLabels = normalizeLabels(labels);
    const key = buildSeriesKey(metricName, normalizedLabels);
    const current = this.counters.get(key);

    this.counters.set(key, {
      labels: normalizedLabels,
      value: (current?.value ?? 0) + value
    });
  }

  private setGauge(
    metricName: Exclude<MetricName, `${string}_total`>,
    labels: Record<string, string>,
    value: number
  ): void {
    const normalizedLabels = normalizeLabels(labels);
    const key = buildSeriesKey(metricName, normalizedLabels);

    this.gauges.set(key, {
      labels: normalizedLabels,
      value
    });
  }

  private getSeriesForMetric(metricName: MetricName, definition: MetricDefinition): MetricSeries[] {
    const source = definition.type === "counter" ? this.counters : this.gauges;

    return [...source.entries()]
      .filter(([key]) => key.startsWith(`${metricName}::`))
      .map(([, series]) => series)
      .sort((left, right) =>
        JSON.stringify(left.labels).localeCompare(JSON.stringify(right.labels))
      );
  }
}
