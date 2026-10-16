import createNextIntlPlugin from "next-intl/plugin";
import { webSecurityHeaders } from "./lib/security-headers.js";

const withNextIntl = createNextIntlPlugin();

const nextConfig = {
  poweredByHeader: false,
  // Presentation mode: do not intentionally remount client components in development.
  reactStrictMode: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/hfe5dzce/image/upload/**",
      },
    ],
  },
  async rewrites() {
    const apiOrigin = process.env.COSERVE_API_ORIGIN;
    return apiOrigin
      ? [{ source: "/api/v1/:path*", destination: `${apiOrigin}/api/v1/:path*` }]
      : [];
  },
  async headers() { return [{ source: "/(.*)", headers: webSecurityHeaders() }]; },
};

export default withNextIntl(nextConfig);
