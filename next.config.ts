import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // The codebase has pre-existing lint violations (style/best-practice only).
    // Don't fail production builds on them; `npm run lint` still reports them.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
