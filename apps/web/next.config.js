/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
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
};

module.exports = nextConfig;
