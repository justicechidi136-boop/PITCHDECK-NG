import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@pitchdeck/ui", "@pitchdeck/contracts"],
  reactStrictMode: true,
};

export default nextConfig;
