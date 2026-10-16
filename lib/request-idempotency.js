export function createRequestSubmission(keyFactory) {
  return { key: keyFactory(), fingerprint: null, outcome: "fresh" };
}

export function prepareRequestSubmission(state, fingerprint, keyFactory) {
  if (!state.fingerprint) return { ready: true, state: { ...state, fingerprint } };
  if (state.outcome === "ambiguous") return { ready: false, reason: "ambiguous", state };
  if (state.fingerprint === fingerprint) return { ready: true, state };
  if (state.outcome === "unknown") {
    return { ready: false, reason: "ambiguous", state: { ...state, outcome: "ambiguous" } };
  }
  return { ready: true, state: { key: keyFactory(), fingerprint, outcome: "fresh" } };
}

export function recordRequestFailure(state, error) {
  if (error?.status === 409 && error?.code === "MARKETPLACE_CONFLICT") {
    return { ...state, outcome: "ambiguous" };
  }
  if (error?.status >= 400 && error.status < 500) return { ...state, outcome: "definite" };
  return { ...state, outcome: "unknown" };
}
