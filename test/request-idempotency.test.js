import { describe, expect, it, vi } from "vitest";
import { createRequestSubmission, prepareRequestSubmission, recordRequestFailure } from "../lib/request-idempotency.js";

describe("request form idempotency state", () => {
  it("reuses one key for unknown retries of the same payload", () => {
    const keys = vi.fn().mockReturnValueOnce("key-one").mockReturnValueOnce("key-two");
    let state = createRequestSubmission(keys);
    state = prepareRequestSubmission(state, "payload-a", keys).state;
    state = recordRequestFailure(state, {});
    const retry = prepareRequestSubmission(state, "payload-a", keys);
    expect(retry).toMatchObject({ ready: true, state: { key: "key-one", fingerprint: "payload-a", outcome: "unknown" } });
    expect(keys).toHaveBeenCalledTimes(1);
  });

  it("blocks changed payloads after uncertainty until an explicit new request", () => {
    const keys = vi.fn().mockReturnValueOnce("key-one").mockReturnValueOnce("key-two");
    let state = prepareRequestSubmission(createRequestSubmission(keys), "payload-a", keys).state;
    state = recordRequestFailure(state, { status: 503 });
    const changed = prepareRequestSubmission(state, "payload-b", keys);
    expect(changed).toMatchObject({ ready: false, reason: "ambiguous", state: { key: "key-one", fingerprint: "payload-a", outcome: "ambiguous" } });
    expect(prepareRequestSubmission(createRequestSubmission(keys), "payload-b", keys)).toMatchObject({ ready: true, state: { key: "key-two", fingerprint: "payload-b" } });
  });

  it("rotates safely after a definite failure and treats mismatch conflicts as ambiguous", () => {
    const keys = vi.fn().mockReturnValueOnce("key-one").mockReturnValueOnce("key-two");
    let state = prepareRequestSubmission(createRequestSubmission(keys), "payload-a", keys).state;
    state = recordRequestFailure(state, { status: 400, code: "VALIDATION_ERROR" });
    const changed = prepareRequestSubmission(state, "payload-b", keys);
    expect(changed.state.key).toBe("key-two");
    const ambiguous = recordRequestFailure(changed.state, { status: 409, code: "MARKETPLACE_CONFLICT" });
    expect(ambiguous.outcome).toBe("ambiguous");
    expect(prepareRequestSubmission(ambiguous, "payload-b", keys)).toMatchObject({ ready: false, reason: "ambiguous" });
  });
});
