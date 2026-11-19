import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  webpack: (config) => {
    config.module.rules.push({
      test: /jpegtran\.mjs$/,
      enforce: "pre",
      use: ["./lib/stubs/jpegtran-loader.cjs"],
    });
    config.resolve.fallback = {
      ...(config.resolve.fallback ?? {}),
      fs: false,
      path: false,
      crypto: false,
      module: false,
    };
    return config;
  },
  async redirects() {
    return [
      { source: "/heic-to-jpeg", destination: "/heic-to-jpg", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [{ key: "Cache-Control", value: "no-cache" }],
      },
      {
        source: "/llms.txt",
        headers: [{ key: "Content-Type", value: "text/plain; charset=utf-8" }],
      },
    ];
  },
};

export default nextConfig;
