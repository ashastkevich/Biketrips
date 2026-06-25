import type {
  CreateParticipantInput,
  CreateTripInput,
  ParticipantStatus,
  TripDetail,
  TripFilters,
  TripParticipant,
  TripSummary,
} from "@biketrips/domain";

export interface ApiClientOptions {
  baseUrl: string;
  fetcher?: typeof fetch;
  authToken?: string;
}

export interface HealthResponse {
  status: "ok";
  service: string;
}

export class BikeTripsApiClient {
  private readonly baseUrl: string;
  private readonly fetcher: typeof fetch;
  private readonly authToken?: string;

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.fetcher = options.fetcher ?? fetch;
    this.authToken = options.authToken;
  }

  async health(): Promise<HealthResponse> {
    return this.get<HealthResponse>("/health");
  }

  async listTrips(filters: TripFilters = {}): Promise<TripSummary[]> {
    return this.get<TripSummary[]>(this.withQuery("/trips", filters));
  }

  async getTrip(slugOrId: string): Promise<TripDetail> {
    return this.get<TripDetail>(`/trips/${encodeURIComponent(slugOrId)}`);
  }

  async createTrip(input: CreateTripInput): Promise<TripDetail> {
    return this.post<TripDetail>("/trips", input, true);
  }

  async publishTrip(id: string): Promise<TripDetail> {
    return this.post<TripDetail>(`/trips/${encodeURIComponent(id)}/publish`, {}, true);
  }

  async cancelTrip(id: string): Promise<TripDetail> {
    return this.post<TripDetail>(`/trips/${encodeURIComponent(id)}/cancel`, {}, true);
  }

  async finishTrip(id: string): Promise<TripDetail> {
    return this.post<TripDetail>(`/trips/${encodeURIComponent(id)}/finish`, {}, true);
  }

  async joinTrip(id: string, input: CreateParticipantInput): Promise<TripParticipant> {
    return this.post<TripParticipant>(`/trips/${encodeURIComponent(id)}/participants`, input);
  }

  async listParticipants(id: string): Promise<TripParticipant[]> {
    return this.get<TripParticipant[]>(`/trips/${encodeURIComponent(id)}/participants`, true);
  }

  async updateParticipantStatus(
    tripId: string,
    participantId: string,
    status: ParticipantStatus
  ): Promise<TripParticipant> {
    return this.patch<TripParticipant>(
      `/trips/${encodeURIComponent(tripId)}/participants/${encodeURIComponent(participantId)}`,
      { status },
      true
    );
  }

  private async get<TResponse>(path: string, authenticated = false): Promise<TResponse> {
    const response = await this.request(path, { method: "GET" }, authenticated);

    return (await response.json()) as TResponse;
  }

  private async post<TResponse>(
    path: string,
    body: unknown,
    authenticated = false
  ): Promise<TResponse> {
    const response = await this.request(
      path,
      {
        method: "POST",
        body: JSON.stringify(body),
      },
      authenticated
    );

    return (await response.json()) as TResponse;
  }

  private async patch<TResponse>(
    path: string,
    body: unknown,
    authenticated = false
  ): Promise<TResponse> {
    const response = await this.request(
      path,
      {
        method: "PATCH",
        body: JSON.stringify(body),
      },
      authenticated
    );

    return (await response.json()) as TResponse;
  }

  private async request(
    path: string,
    init: RequestInit,
    authenticated = false
  ): Promise<Response> {
    const headers = new Headers(init.headers);
    headers.set("Accept", "application/json");

    if (init.body) {
      headers.set("Content-Type", "application/json");
    }

    if (authenticated) {
      if (!this.authToken) {
        throw new Error("BikeTrips API request requires an auth token");
      }

      headers.set("Authorization", `Bearer ${this.authToken}`);
    }

    const response = await this.fetcher(`${this.baseUrl}${path}`, {
      ...init,
      headers,
    });

    if (!response.ok) {
      throw new Error(`BikeTrips API request failed: ${response.status} ${response.statusText}`);
    }

    return response;
  }

  private withQuery(path: string, filters: TripFilters): string {
    const query = new URLSearchParams();

    if (filters.city) query.set("city", filters.city);
    if (filters.difficulty) query.set("difficulty", filters.difficulty);
    if (filters.bikeType) query.set("bikeType", filters.bikeType);
    if (filters.dateFrom) query.set("dateFrom", filters.dateFrom);
    if (filters.dateTo) query.set("dateTo", filters.dateTo);
    if (filters.includeDrafts) query.set("includeDrafts", "true");

    const serializedQuery = query.toString();

    return serializedQuery ? `${path}?${serializedQuery}` : path;
  }
}
