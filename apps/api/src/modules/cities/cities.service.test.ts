import { describe, expect, it, vi } from "vitest";

import { CitiesService } from "./cities.service.js";

describe("CitiesService", () => {
  it("returns cities in a public numeric representation", async () => {
    const repository = {
      find: vi.fn().mockResolvedValue([
        {
          id: "city-1",
          name: "Москва",
          slug: "moscow",
          timezone: "Europe/Moscow",
          centerLat: "55.755864",
          centerLng: "37.617698",
        },
      ]),
    };
    const service = new CitiesService(repository as never);

    await expect(service.list()).resolves.toEqual([
      {
        id: "city-1",
        name: "Москва",
        slug: "moscow",
        timezone: "Europe/Moscow",
        centerLat: 55.755864,
        centerLng: 37.617698,
      },
    ]);
    expect(repository.find).toHaveBeenCalledWith({ order: { name: "ASC" } });
  });
});
