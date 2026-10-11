import { describe, expect, it } from "vitest";

import { getApiErrorMessage } from "./api-error-message";

describe("getApiErrorMessage", () => {
  it("returns a single API message", () => {
    expect(getApiErrorMessage({ message: "Код истёк или не найден" }, "fallback")).toBe(
      "Код истёк или не найден",
    );
  });

  it("returns the first message of a validation error list", () => {
    expect(
      getApiErrorMessage(
        { message: ["Укажите корректный адрес электронной почты", "second"], statusCode: 400 },
        "fallback",
      ),
    ).toBe("Укажите корректный адрес электронной почты");
  });

  it("falls back when there is no usable message", () => {
    expect(getApiErrorMessage(null, "fallback")).toBe("fallback");
    expect(getApiErrorMessage({ message: [] }, "fallback")).toBe("fallback");
    expect(getApiErrorMessage({ message: 42 }, "fallback")).toBe("fallback");
    expect(getApiErrorMessage({ error: "Bad Request" }, "fallback")).toBe("fallback");
  });
});
