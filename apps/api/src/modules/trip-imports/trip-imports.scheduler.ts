import {
  Inject,
  Injectable,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from "@nestjs/common";

import { TripImportsService } from "./trip-imports.service.js";

const defaultIntervalMinutes = 120;

/** Import runs only where it is switched on and an Anthropic API key is configured. */
export function isTripImportEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.TRIP_IMPORT_ENABLED === "true" && Boolean(env.ANTHROPIC_API_KEY);
}

export function readTripImportIntervalMs(env: NodeJS.ProcessEnv = process.env): number {
  const minutes = Number.parseInt(env.TRIP_IMPORT_INTERVAL_MINUTES ?? "", 10);
  return (Number.isInteger(minutes) && minutes > 0 ? minutes : defaultIntervalMinutes) * 60 * 1000;
}

@Injectable()
export class TripImportsScheduler implements OnApplicationBootstrap, OnApplicationShutdown {
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    @Inject(TripImportsService)
    private readonly tripImportsService: TripImportsService
  ) {}

  onApplicationBootstrap(): void {
    if (!isTripImportEnabled()) return;
    void this.run();
    this.timer = setInterval(() => void this.run(), readTripImportIntervalMs());
    this.timer.unref();
  }

  onApplicationShutdown(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  async run(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const result = await this.tripImportsService.runEnabledSources();
      if (result.created + result.updated + result.cancelled + result.errors > 0) {
        console.info("[BikeTrips] Telegram import", result);
      }
    } catch (error) {
      console.error("[BikeTrips] Telegram import failed", error);
    } finally {
      this.running = false;
    }
  }
}
