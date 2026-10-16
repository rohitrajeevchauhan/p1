const periods = new Set(["7d", "30d", "90d", "all"]);
const objectId = /^[a-f\d]{24}$/i;
const actionValue = /^[a-z0-9_.-]{1,120}$/i;
const targetValue = /^[a-z][a-z0-9_-]{0,79}$/i;

export function operationsScopeQuery({ period = "30d", federationId = "", organizationId = "", page, limit, action = "", targetType = "" } = {}) {
  const params = new URLSearchParams({ period: periods.has(period) ? period : "30d" });
  if (objectId.test(federationId)) params.set("federationId", federationId);
  if (objectId.test(organizationId)) params.set("organizationId", organizationId);
  if (Number.isInteger(page) && page > 0) params.set("page", String(page));
  if (Number.isInteger(limit) && limit > 0 && limit <= 50) params.set("limit", String(limit));
  if (actionValue.test(action)) params.set("action", action);
  if (targetValue.test(targetType)) params.set("targetType", targetType);
  return params.toString();
}
