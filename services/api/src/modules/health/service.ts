import { MetricsService } from "../metrics/service.js";
import type { HealthLiveness, HealthReadiness } from "./types.js";

const readinessChecks = {
  auth: "up",
  masterData: "up",
  inventory: "up",
  pos: "up",
  omniOrder: "up",
  settlement: "up",
  reporting: "up",
  metrics: "up"
} as const satisfies Record<string, "up">;

export class HealthService {
  private readonly startedAt = Date.now();

  constructor(
    private readonly metricsService: MetricsService,
    private readonly serviceName = "@retail-erp/api"
  ) {}

  getLiveness(): HealthLiveness {
    this.metricsService.recordHealthCheck("live", 1);

    return {
      status: "live",
      service: this.serviceName,
      timestamp: new Date().toISOString(),
      uptimeSeconds: this.getUptimeSeconds()
    };
  }

  getReadiness(): HealthReadiness {
    this.metricsService.recordHealthCheck("ready", 1);

    return {
      status: "ready",
      service: this.serviceName,
      timestamp: new Date().toISOString(),
      uptimeSeconds: this.getUptimeSeconds(),
      checks: { ...readinessChecks }
    };
  }

  private getUptimeSeconds(): number {
    return Math.floor((Date.now() - this.startedAt) / 1000);
  }
}
