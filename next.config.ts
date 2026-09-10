import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: [
    "6a64-2406-7400-bb-d010-1d4d-eecc-4828-8859.ngrok-free.app",
    "*.ngrok-free.app",
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  serverExternalPackages: ["pg", "@opentelemetry/sdk-node", "@langfuse/otel", "@sentry/node"],
};

export default nextConfig;
