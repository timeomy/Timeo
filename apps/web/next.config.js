const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  compress: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.convex.cloud" },
      { protocol: "https", hostname: "**.convex.site" },
      { protocol: "https", hostname: "uploadthing.com" },
      { protocol: "https", hostname: "**.uploadthing.com" },
    ],
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    outputFileTracingRoot: path.join(__dirname, "../../"),
    optimizePackageImports: ["lucide-react", "framer-motion", "@timeo/ui", "convex"],
  },
  transpilePackages: [
    "@timeo/ui",
    "@timeo/shared",
    "@timeo/auth",
    "@timeo/api",
    "@timeo/payments",
    "@timeo/analytics",
    "@timeo/cms",
    "@timeo/notifications",
  ],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
      {
        source: "/(.*)\\.(ico|jpg|jpeg|png|gif|svg|webp|avif|woff|woff2)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
