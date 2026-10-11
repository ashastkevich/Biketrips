const loopbackAddresses = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);

export interface ClientIpRequest {
  headers: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
}

/**
 * The visitor's address. Production traffic reaches the API through nginx (and often the Next.js
 * server) on the same host, which set X-Real-IP; the header is trusted only from loopback, so a
 * direct caller cannot pick its own address.
 */
export function getClientIp(request: ClientIpRequest): string | undefined {
  const remoteAddress = request.socket?.remoteAddress;
  const realIp = request.headers["x-real-ip"];

  if (remoteAddress && loopbackAddresses.has(remoteAddress) && typeof realIp === "string") {
    const trimmed = realIp.trim();
    if (trimmed) return trimmed;
  }

  return remoteAddress;
}
