import { afterEach, describe, expect, it, vi } from "vitest";

import { TripsAutoFinishScheduler, tripsAutoFinishIntervalMs } from "./trips-auto-finish.scheduler.js";
import type { TripsService } from "./trips.service.js";

describe("TripsAutoFinishScheduler", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("finishes elapsed trips on bootstrap and on every interval", async () => {
    vi.useFakeTimers();
    const tripsService = { finishElapsedTrips: vi.fn().mockResolvedValue(0) };
    const scheduler = new TripsAutoFinishScheduler(tripsService as unknown as TripsService);

    scheduler.onApplicationBootstrap();
    await vi.advanceTimersByTimeAsync(0);
    expect(tripsService.finishElapsedTrips).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(tripsAutoFinishIntervalMs);
    expect(tripsService.finishElapsedTrips).toHaveBeenCalledTimes(2);

    scheduler.onApplicationShutdown();
    await vi.advanceTimersByTimeAsync(tripsAutoFinishIntervalMs);
    expect(tripsService.finishElapsedTrips).toHaveBeenCalledTimes(2);
  });

  it("logs failures instead of throwing", async () => {
    const error = new Error("database is down");
    const tripsService = { finishElapsedTrips: vi.fn().mockRejectedValue(error) };
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const scheduler = new TripsAutoFinishScheduler(tripsService as unknown as TripsService);

    await expect(scheduler.run()).resolves.toBeUndefined();
    expect(consoleError).toHaveBeenCalledWith("[BikeTrips] Trip auto-finish failed", error);
  });
});
