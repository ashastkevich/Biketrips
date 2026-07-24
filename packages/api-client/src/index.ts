import type {
  CreateParticipantInput,
  CreateTripInput,
  City,
  ParticipantStatus,
  TripDetail,
  TripFilters,
  TripParticipant,
  TripSummary,
  UpdateTripInput,
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

  async listCities(): Promise<City[]> {
    return this.get<City[]>("/cities");
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

  async createTripWithRouteFile(
    input: CreateTripInput,
    routeFile: File | undefined,
    coverImageFile?: File,
  ): Promise<TripDetail> {
    const formData = new FormData();
    formData.set("payload", JSON.stringify(input));
    if (routeFile) formData.set("routeGpxFile", routeFile);
    if (coverImageFile) formData.set("coverImageFile", coverImageFile);

    return this.postForm<TripDetail>("/trips/with-route-file", formData, true);
  }

  async updateTrip(id: string, input: UpdateTripInput): Promise<TripDetail> {
    return this.patch<TripDetail>(`/trips/${encodeURIComponent(id)}`, input, true);
  }

  async updateTripWithRouteFile(
    id: string,
    input: UpdateTripInput,
    options: { routeFile?: File; coverImageFile?: File; removeRouteFile?: boolean } = {},
  ): Promise<TripDetail> {
    const formData = new FormData();
    formData.set("payload", JSON.stringify(input));
    if (options.routeFile) formData.set("routeGpxFile", options.routeFile);
    if (options.coverImageFile) formData.set("coverImageFile", options.coverImageFile);
    if (options.removeRouteFile) formData.set("removeRouteFile", "true");

    return this.patchForm<TripDetail>(
      `/trips/${encodeURIComponent(id)}/with-route-file`,
      formData,
      true,
    );
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
    return this.post<TripParticipant>(`/trips/${encodeURIComponent(id)}/participants`, input, true);
  }

  async getParticipation(id: string): Promise<TripParticipant | null> {
    return this.get<TripParticipant | null>(
      `/trips/${encodeURIComponent(id)}/participation`,
      true,
    );
  }

  async cancelParticipation(id: string): Promise<TripParticipant> {
    return this.delete<TripParticipant>(
      `/trips/${encodeURIComponent(id)}/participants/me`,
      true,
    );
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

  private async postForm<TResponse>(
    path: string,
    body: FormData,
    authenticated = false,
  ): Promise<TResponse> {
    const response = await this.request(path, { method: "POST", body }, authenticated);

    return (await response.json()) as TResponse;
  }

  private async patchForm<TResponse>(
    path: string,
    body: FormData,
    authenticated = false,
  ): Promise<TResponse> {
    const response = await this.request(path, { method: "PATCH", body }, authenticated);

    return (await response.json()) as TResponse;
  }

  private async delete<TResponse>(
    path: string,
    authenticated = false,
  ): Promise<TResponse> {
    const response = await this.request(path, { method: "DELETE" }, authenticated);

    return (await response.json()) as TResponse;
  }

  private async request(
    path: string,
    init: RequestInit,
    authenticated = false
  ): Promise<Response> {
    const headers = new Headers(init.headers);
    headers.set("Accept", "application/json");

    if (init.body && !(init.body instanceof FormData)) {
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
      const body = await response.json().catch(() => null) as {
        error?: string;
        message?: string | string[];
      } | null;
      const details = Array.isArray(body?.message)
        ? body.message.join("; ")
        : body?.message ?? body?.error;
      throw new Error(
        details
          ? `BikeTrips API request failed: ${details}`
          : `BikeTrips API request failed: ${response.status} ${response.statusText}`,
      );
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
