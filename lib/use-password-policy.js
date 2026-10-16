"use client";

import { useEffect, useState } from "react";
import { apiClient } from "./api-client.js";

const SAFE_FALLBACK_POLICY = Object.freeze({ minimumLength: 6, maximumLength: 128 });

export function usePasswordPolicy() {
  const [policy, setPolicy] = useState(SAFE_FALLBACK_POLICY);
  const [policyUnavailable, setPolicyUnavailable] = useState(false);

  useEffect(() => {
    apiClient.passwordPolicy()
      .then((payload) => setPolicy(payload.data.policy))
      .catch(() => setPolicyUnavailable(true));
  }, []);

  return { policy, policyUnavailable };
}
