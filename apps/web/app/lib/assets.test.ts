import { describe, expect, it } from "vitest";

import { getTripCardCoverBackground, getTripCoverBackground } from "./assets";

describe("asset helpers", () => {
  it("does not generate CSS urls for missing trip covers", () => {
    expect(getTripCoverBackground(undefined)).not.toContain("undefined");
    expect(getTripCoverBackground(null)).not.toContain("null");
    expect(getTripCardCoverBackground(undefined)).not.toContain("undefined");
    expect(getTripCardCoverBackground(null)).not.toContain("null");
  });

  it("uses provided cover images when present", () => {
    expect(getTripCoverBackground("/img/Photo1.jpg")).toBe('url("/img/Photo1.jpg")');
    expect(getTripCardCoverBackground("/img/Photo1.jpg")).toContain('url("/img/Photo1.jpg")');
  });
});
