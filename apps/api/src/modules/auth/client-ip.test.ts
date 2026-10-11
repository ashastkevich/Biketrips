import { describe, expect, it } from "vitest";

import { getClientIp } from "./client-ip.js";

describe("getClientIp", () => {
  it("uses X-Real-IP set by a proxy on the same host", () => {
    expect(
      getClientIp({ headers: { "x-real-ip": " 203.0.113.7 " }, socket: { remoteAddress: "127.0.0.1" } }),
    ).toBe("203.0.113.7");
    expect(
      getClientIp({ headers: { "x-real-ip": "203.0.113.7" }, socket: { remoteAddress: "::ffff:127.0.0.1" } }),
    ).toBe("203.0.113.7");
  });

  it("ignores X-Real-IP from remote callers", () => {
    expect(
      getClientIp({ headers: { "x-real-ip": "203.0.113.7" }, socket: { remoteAddress: "198.51.100.2" } }),
    ).toBe("198.51.100.2");
  });

  it("falls back to the socket address without the header", () => {
    expect(getClientIp({ headers: {}, socket: { remoteAddress: "127.0.0.1" } })).toBe("127.0.0.1");
    expect(getClientIp({ headers: {} })).toBeUndefined();
  });
});
