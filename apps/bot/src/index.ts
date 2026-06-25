import { BikeTripsApiClient } from "@biketrips/api-client";
import { readOptionalEnv } from "@biketrips/config";

const apiUrl = readOptionalEnv("NEXT_PUBLIC_API_URL", "http://localhost:4000");
const client = new BikeTripsApiClient({ baseUrl: apiUrl });

async function main(): Promise<void> {
  console.log("BikeTrips bot worker scaffold is ready.");
  console.log(`API endpoint: ${apiUrl}`);

  try {
    const health = await client.health();
    console.log(`API health: ${health.status}`);
  } catch {
    console.log("API health: unavailable. Start apps/api when wiring bot scenarios.");
  }
}

await main();
