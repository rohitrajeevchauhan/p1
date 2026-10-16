import { categories, localities } from "./catalog.js";

const categorySet = new Set(categories), localitySet = new Set(localities), objectId = /^[a-f\d]{24}$/i;

export function forecastQuery({ mode = "live", category = "", locality = "", organizationId = "", federationId = "" } = {}) {
  const query = new URLSearchParams({ mode: mode === "synthetic_demo" ? mode : "live" });
  if (categorySet.has(category)) query.set("category", category);
  if (localitySet.has(locality)) query.set("locality", locality);
  if (objectId.test(organizationId)) query.set("organizationId", organizationId);
  if (objectId.test(federationId)) query.set("federationId", federationId);
  return query.toString();
}
