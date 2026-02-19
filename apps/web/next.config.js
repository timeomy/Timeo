/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@timeo/ui",
    "@timeo/shared",
    "@timeo/auth",
    "@timeo/api",
    "@timeo/payments",
  ],
};

module.exports = nextConfig;
