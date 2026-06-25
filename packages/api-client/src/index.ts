import type { TripSummary } from "@biketrips/domain";

export interface ApiClientOptions {
  baseUrl: string;
  fetcher?: typeof fetch;
}

export interface HealthResponse {
  status: "ok";
  service: string;
}

export class BikeTripsApiClient {
  private readonly baseUrl: string;
  private readonly fetcher: typeof fetch;

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.fetcher = options.fetcher ?? fetch;
  }

  async health(): Promise<HealthResponse> {
    return this.get<HealthResponse>("/health");
  }

  async listTrips(): Promise<TripSummary[]> {
    return this.get<TripSummary[]>("/trips");
  }

  private async get<TResponse>(path: string): Promise<TResponse> {
    const response = await this.fetcher(`${this.baseUrl}${path}`);

    if (!response.ok) {
      throw new Error(`BikeTrips API request failed: ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as TResponse;
  }
}
