const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
const publicReadCache = new Map();

export class ApiClientError extends Error {
  constructor(response, payload) {
    super(payload?.error?.message || "The request could not be completed.");
    this.name = "ApiClientError";
    this.status = response.status;
    this.code = payload?.error?.code || "REQUEST_FAILED";
    this.details = payload?.error?.details;
  }
}

async function request(path, options = {}, retry = true) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...options.headers,
    },
  });

  if (response.status === 401 && retry && path !== "/auth/refresh") {
    const refreshed = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (refreshed.ok) return request(path, options, false);
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => undefined);
    throw new ApiClientError(response, payload);
  }

  if (response.status === 204) return null;
  return response.json();
}

function cachedPublicRead(path, maxAgeMs = 30_000) {
  const cached = publicReadCache.get(path);
  if (cached && cached.expiresAt > Date.now()) return cached.promise;
  const promise = request(path, {}, false).catch((error) => {
    publicReadCache.delete(path);
    throw error;
  });
  publicReadCache.set(path, { promise, expiresAt: Date.now() + maxAgeMs });
  return promise;
}

export const apiClient = Object.freeze({
  health: () => request("/health", {}, false),
  register: (body) => request("/auth/register", { method: "POST", body: JSON.stringify(body) }, false),
  passwordPolicy: () => request("/auth/password-policy", {}, false),
  login: (body) => request("/auth/login", { method: "POST", body: JSON.stringify(body) }, false),
  me: () => request("/auth/me"),
  updateProfile: (body) => request("/auth/me", { method: "PATCH", body: JSON.stringify(body) }),
  changePassword: (body) => request("/auth/password", { method: "POST", body: JSON.stringify(body) }),
  logout: () => request("/auth/logout", { method: "POST" }),
  logoutAll: () => request("/auth/logout-all", { method: "POST" }),
  adminSettings: () => request("/admin/settings"),
  updateAdminSetting: (key, body) => request(`/admin/settings/${key}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  }),
  federations: () => request("/organizations/federations", {}, false),
  applications: () => request("/organization-applications"),
  application: (id) => request(`/organization-applications/${id}`),
  createApplication: (body) => request("/organization-applications", { method: "POST", body: JSON.stringify(body) }),
  updateApplication: (id, body) => request(`/organization-applications/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  submitApplication: (id, version) => request(`/organization-applications/${id}/submit`, { method: "POST", body: JSON.stringify({ version }) }),
  reviewApplications: (filters = "") => request(`/admin/organizations/applications${filters}`),
  reviewApplication: (id) => request(`/admin/organizations/applications/${id}`),
  startApplicationReview: (id, version) => request(`/admin/organizations/applications/${id}/under-review`, { method: "POST", body: JSON.stringify({ version }) }),
  approveApplication: (id, version, reason) => request(`/admin/organizations/applications/${id}/approve`, { method: "POST", body: JSON.stringify({ version, reason }) }),
  rejectApplication: (id, version, reason) => request(`/admin/organizations/applications/${id}/reject`, { method: "POST", body: JSON.stringify({ version, reason }) }),
  adminOrganizations: () => request("/admin/organizations"),
  suspendOrganization: (id, reason) => request(`/admin/organizations/${id}/suspend`, { method: "POST", body: JSON.stringify({ reason }) }),
  restoreOrganization: (id, reason) => request(`/admin/organizations/${id}/restore`, { method: "POST", body: JSON.stringify({ reason }) }),
  federationAffiliations: (organizationId) => request(`/federations/${organizationId}/affiliations`),
  myFederations: () => request("/federations/mine"),
  decideAffiliation: (organizationId, id, decision, version, reason) => request(`/federations/${organizationId}/affiliations/${id}/${decision}`, { method: "POST", body: JSON.stringify({ version, reason }) }),
  workerSkills: () => request("/workers/skills", {}, false),
  workerCooperatives: () => request("/workers/cooperatives", {}, false),
  locationSearch: (q) => request(`/locations/search?q=${encodeURIComponent(q)}`, {}, false),
  reverseLocation: (longitude, latitude) => request(`/locations/reverse?longitude=${longitude}&latitude=${latitude}`, {}, false),
  savedLocations: () => request("/locations/saved"),
  savedLocation: (id) => request(`/locations/saved/${id}`),
  saveLocation: (body) => request("/locations/saved", { method: "POST", body: JSON.stringify(body) }),
  workerMe: () => request("/workers/me"),
  publicWorker: (id) => request(`/workers/public/${id}`, {}, false),
  saveWorkerProfile: (body) => request("/workers/me/profile", { method: "PUT", body: JSON.stringify(body) }),
  uploadWorkerProfilePhoto: (body) => request("/workers/me/profile-photo", { method: "PUT", body: JSON.stringify(body) }),
  requestMembership: (cooperativeId) => request("/workers/me/memberships", { method: "POST", body: JSON.stringify({ cooperativeId }) }),
  cancelMembership: (id, version) => request(`/workers/me/memberships/${id}/cancel`, { method: "POST", body: JSON.stringify({ version }) }),
  respondInvitation: (id, action, version, reason) => request(`/workers/me/invitations/${id}/${action}`, { method: "POST", body: JSON.stringify({ version, reason }) }),
  uploadIdentity: (body) => request("/workers/me/identity", { method: "PUT", body: JSON.stringify(body) }),
  addCertificate: (body) => request("/workers/me/certificates", { method: "POST", body: JSON.stringify(body) }),
  accessWorkerDocument: (kind, id) => request(`/workers/documents/${kind}/${id}/access`, { method: "POST", body: "{}" }),
  submitWorkerVerification: () => request("/workers/me/verification", { method: "POST", body: "{}" }),
  myCooperatives: () => request("/cooperative-workers/mine"),
  workerQueue: (id) => request(`/cooperative-workers/${id}/queue`),
  inviteWorker: (id, identifier) => request(`/cooperative-workers/${id}/invitations`, { method: "POST", body: JSON.stringify({ identifier }) }),
  decideMembership: (organizationId, id, action, version, reason) => request(`/cooperative-workers/${organizationId}/memberships/${id}/${action}`, { method: "POST", body: JSON.stringify({ version, reason }) }),
  decideWorkerVerification: (organizationId, id, action, version, reason) => request(`/cooperative-workers/${organizationId}/verifications/${id}/${action}`, { method: "POST", body: JSON.stringify({ version, reason }) }),
  revokeWorkerCertificate: (organizationId, id, version, reason) => request(`/cooperative-workers/${organizationId}/certificates/${id}/revoke`, { method: "POST", body: JSON.stringify({ version, reason }) }),
  workerAudits: () => request("/worker-audits"),
  revokeWorkerVerification: (id, version, reason) => request(`/worker-audits/${id}/revoke`, { method: "POST", body: JSON.stringify({ version, reason }) }),
  marketplaceCatalog: () => cachedPublicRead("/marketplace/catalog", 5 * 60_000),
  discoverOfferings: (query = "") => cachedPublicRead(`/marketplace/offerings${query ? `?${query}` : ""}`),
  publicCooperative: (slug) => request(`/marketplace/cooperatives/${slug}`, {}, false),
  adminCatalog: () => request("/admin/catalog"),
  updateCategory: (id, body) => request(`/admin/catalog/categories/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  updateLocality: (id, body) => request(`/admin/catalog/localities/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  cooperativeOfferings: (id) => request(`/cooperative-offerings/${id}`),
  createOffering: (id, body) => request(`/cooperative-offerings/${id}`, { method: "POST", body: JSON.stringify(body) }),
  updateOffering: (organizationId, id, body) => request(`/cooperative-offerings/${organizationId}/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  archiveOffering: (organizationId, id, version, reason) => request(`/cooperative-offerings/${organizationId}/${id}/archive`, { method: "POST", body: JSON.stringify({ version, reason }) }),
  createServiceRequest: (body) => request("/service-requests", { method: "POST", body: JSON.stringify(body) }),
  myServiceRequests: () => request("/service-requests"),
  serviceRequest: (id) => request(`/service-requests/${id}`),
  bookingAvailability: () => request("/bookings/availability"),
  saveBookingAvailability: (body) => request("/bookings/availability", { method: "PUT", body: JSON.stringify(body) }),
  workerBookings: () => request("/bookings/worker"),
  respondBookingOffer: (id, action, body) => request(`/bookings/offers/${id}/${action}`, { method: "POST", body: JSON.stringify(body) }),
  customerBooking: (id) => request(`/bookings/requests/${id}`),
  cancelCustomerBooking: (id, body) => request(`/bookings/requests/${id}/cancel`, { method: "POST", body: JSON.stringify(body) }),
  regenerateBookingCode: (id, kind, version) => request(`/bookings/requests/${id}/codes/${kind}/regenerate`, { method: "POST", body: JSON.stringify({ version }) }),
  workerBookingAction: (id, action, body) => request(`/bookings/jobs/${id}/${action}`, { method: "POST", body: JSON.stringify(body) }),
  cooperativeBookings: (id) => request(`/bookings/cooperative/${id}`),
  cooperativeBookingAction: (organizationId, id, action, body) => request(`/bookings/cooperative/${organizationId}/${id}/${action}`, { method: "POST", body: JSON.stringify(body) }),
  bookingOversight: (organizationId = "") => request(`/bookings/oversight${organizationId ? `?organizationId=${organizationId}` : ""}`),
  customerFinance: (id) => request(`/finance/customer/bookings/${id}`),
  acceptFinalPrice: (id, version) => request(`/finance/customer/bookings/${id}/accept-price`, { method: "POST", body: JSON.stringify({ version }) }),
  makeDemoPayment: (id, body) => request(`/finance/customer/bookings/${id}/pay`, { method: "POST", body: JSON.stringify(body) }),
  ownerInvoice: (id) => request(`/finance/customer/bookings/${id}/invoice`),
  createReview: (id, body) => request(`/finance/customer/bookings/${id}/review`, { method: "POST", body: JSON.stringify(body) }),
  workerFinance: () => request("/finance/worker"),
  cooperativeFinance: (id) => request(`/finance/cooperative/${id}/report`),
  proposeFinalPrice: (organizationId, bookingId, body) => request(`/finance/cooperative/${organizationId}/bookings/${bookingId}/price`, { method: "POST", body: JSON.stringify(body) }),
  createBenefit: (organizationId, body) => request(`/finance/cooperative/${organizationId}/benefits`, { method: "POST", body: JSON.stringify(body) }),
  updateBenefit: (organizationId, id, body) => request(`/finance/cooperative/${organizationId}/benefits/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  complaints: () => request("/finance/complaints"),
  createComplaint: (body) => request("/finance/complaints", { method: "POST", body: JSON.stringify(body) }),
  escalateComplaint: (id, body) => request(`/finance/complaints/${id}/escalate`, { method: "POST", body: JSON.stringify(body) }),
  cooperativeComplaints: (id) => request(`/finance/cooperative/${id}/complaints`),
  cooperativeComplaintAction: (organizationId, id, action, body) => request(`/finance/cooperative/${organizationId}/complaints/${id}/${action}`, { method: "POST", body: JSON.stringify(body) }),
  financeOversight: (organizationId = "") => request(`/finance/oversight${organizationId ? `?organizationId=${organizationId}` : ""}`),
  escalationComplaints: () => request("/finance/escalations"),
  escalationAction: (id, action, body) => request(`/finance/escalations/${id}/${action}`, { method: "POST", body: JSON.stringify(body) }),
  safetyTakeover: (id, body) => request(`/finance/escalations/${id}/safety-takeover`, { method: "POST", body: JSON.stringify(body) }),
  adminReviews: () => request("/finance/admin/reviews"),
  moderateReview: (id, body) => request(`/finance/admin/reviews/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  publicWorkerReviews: (id) => request(`/finance/public/workers/${id}/reviews`, {}, false),
  publicCooperativeReviews: (id) => request(`/finance/public/cooperatives/${id}/reviews`, {}, false),
  cooperativeOperations: (id, period = "30d") => request(`/operations/cooperative/${id}/dashboard?period=${period}`),
  cooperativeAudit: (id, query = "page=1&limit=20") => request(`/operations/cooperative/${id}/audit?${query}`),
  operationsOversight: (query = "period=30d") => request(`/operations/oversight/dashboard?${query}`),
  operationsAudit: (query = "period=30d&page=1&limit=20") => request(`/operations/oversight/audit?${query}`),
  cooperativeForecast: (id, query = "mode=live") => request(`/forecasts/cooperative/${id}?${query}`),
  oversightForecast: (query = "mode=live") => request(`/forecasts/oversight?${query}`),
  notifications: () => request("/notifications"),
});
