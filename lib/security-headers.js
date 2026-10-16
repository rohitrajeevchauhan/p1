function apiOrigin(value) { try { return new URL(value).origin; } catch { return "http://localhost:8000"; } }

export function webSecurityHeaders(environment = process.env) {
  const connect = apiOrigin(environment.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1");
  const development = environment.NODE_ENV === "development";
  const production = environment.NODE_ENV === "production" && environment.COSERVE_PUBLIC_DEPLOYMENT === "true";
  const scriptSources = ["'self'", "'unsafe-inline'", ...(development ? ["'unsafe-eval'"] : [])];
  const csp = ["default-src 'self'", "base-uri 'self'", "object-src 'none'", "frame-ancestors 'none'", "form-action 'self'", `script-src ${scriptSources.join(" ")}`, "style-src 'self' 'unsafe-inline'", "img-src 'self' data: blob: https://res.cloudinary.com https://images.unsplash.com", `connect-src 'self' ${connect}`, "font-src 'self' data:", "manifest-src 'self'", "worker-src 'self'"].join("; ");
  return [
    { key: "Content-Security-Policy", value: csp },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    ...(production ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }] : []),
  ];
}
