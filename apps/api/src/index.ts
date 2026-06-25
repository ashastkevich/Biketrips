import { createServer } from "node:http";

import { readPortEnv } from "@biketrips/config";
import type { TripSummary } from "@biketrips/domain";

const port = readPortEnv("API_PORT", 4000);

const demoTrips: TripSummary[] = [
  {
    id: "demo-trip-1",
    slug: "moscow-evening-gravel",
    title: "Вечерний gravel по паркам",
    city: "Москва",
    startDateTime: "2026-07-04T18:30:00+03:00",
    distanceKm: 42,
    difficulty: "medium",
    pace: "steady",
    bikeTypes: ["gravel", "hybrid", "mtb"],
    surfaceTypes: ["gravel", "park_paths", "mixed"],
    format: "no_drop",
    status: "published",
    capacity: 14,
    confirmedParticipants: 8,
  },
];

const server = createServer((request, response) => {
  response.setHeader("Access-Control-Allow-Origin", process.env.API_CORS_ORIGIN ?? "*");
  response.setHeader("Content-Type", "application/json; charset=utf-8");

  if (request.url === "/health") {
    response.writeHead(200);
    response.end(JSON.stringify({ status: "ok", service: "api" }));
    return;
  }

  if (request.url === "/trips") {
    response.writeHead(200);
    response.end(JSON.stringify(demoTrips));
    return;
  }

  response.writeHead(404);
  response.end(JSON.stringify({ error: "Not found" }));
});

server.listen(port, () => {
  console.log(`BikeTrips API is listening on http://localhost:${port}`);
});
