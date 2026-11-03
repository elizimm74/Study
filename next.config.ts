import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Playwright controls a real browser, so it must run as normal Node.js code
  // instead of being bundled like the rest of the app.
  serverExternalPackages: ["playwright"],
};

export default nextConfig;
