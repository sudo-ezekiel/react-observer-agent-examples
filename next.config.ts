import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export: the whole site is prerendered to out/ and served by a
  // Cloudflare Worker from static assets. Nothing here needs a server.
  output: "export",
  // The export has no image optimizer behind it.
  images: { unoptimized: true },
  // Emit a directory per route so /examples/confirmation/ resolves without a
  // server-side rewrite.
  trailingSlash: true,
};

export default nextConfig;
