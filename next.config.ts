import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Playwright controls a real browser, so it must run as normal Node.js code
  // instead of being bundled like the rest of the app.
  serverExternalPackages: ["playwright"],
  // Basic security headers on every page.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" }, // nobody can put Crawler inside their site
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
