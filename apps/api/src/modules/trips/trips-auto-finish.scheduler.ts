import {
  Inject,
  Injectable,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from "@nestjs/common";

import { TripsService } from "./trips.service.js";

export const tripsAutoFinishIntervalMs = 10 * 60 * 1000;

@Injectable()
export class TripsAutoFinishScheduler implements OnApplicationBootstrap, OnApplicationShutdown {
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    @Inject(TripsService)
    private readonly tripsService: TripsService
  ) {}

  onApplicationBootstrap(): void {
    void this.run();
    this.timer = setInterval(() => void this.run(), tripsAutoFinishIntervalMs);
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
      const finished = await this.tripsService.finishElapsedTrips();
      if (finished > 0) {
        console.info(`[BikeTrips] Auto-finished ${finished} trip(s)`);
      }
    } catch (error) {
      console.error("[BikeTrips] Trip auto-finish failed", error);
    } finally {
      this.running = false;
    }
  }
}
