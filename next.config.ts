import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Allow the app's 5 MB template-image limit plus multipart form overhead.
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
