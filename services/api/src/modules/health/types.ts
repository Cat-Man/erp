export interface HealthLiveness {
  status: "live";
  service: string;
  timestamp: string;
  uptimeSeconds: number;
}

export interface HealthReadiness {
  status: "ready";
  service: string;
  timestamp: string;
  uptimeSeconds: number;
  checks: Record<string, "up">;
}
