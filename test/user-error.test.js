import { describe, expect, it } from "vitest";
import { userError } from "../lib/user-error.js";

describe("safe user-facing API errors", () => {
  it("prefers localized field guidance over generic validation copy", () => {
    const error = {
      status: 400,
      code: "VALIDATION_ERROR",
      details: { fields: { preferredAt: "server detail" } },
    };
    expect(
      userError(error, "fallback", {
        VALIDATION_ERROR: "generic",
        fields: { preferredAt: "Choose a valid schedule." },
      }),
    ).toBe("Choose a valid schedule.");
  });

  it("maps known codes and status values without hiding network failures", () => {
    expect(
      userError({ status: 429, code: "TOO_MANY_REQUESTS" }, "fallback", {
        status: { 429: "Wait and retry." },
      }),
    ).toBe("Wait and retry.");
    expect(
      userError(new TypeError("fetch failed"), "Check your connection."),
    ).toBe("Check your connection.");
  });
});
